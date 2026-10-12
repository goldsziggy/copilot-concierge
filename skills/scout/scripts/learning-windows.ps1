# Fixed Windows PowerShell 5.1 transport. No profiles, policy bypass, shell
# interpolation or external commands. All request data arrives as UTF-8 JSON.
# Protects ordinary path mistakes and stale updates, not hostile same-user races.
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$encoding = New-Object System.Text.UTF8Encoding($false, $true)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

try {
    if ($PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -lt 1 -or
        $ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') {
        throw 'unsupported'
    }
    Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Win32.SafeHandles;

namespace ConciergeLearning {
    public sealed class StoreError : Exception { public StoreError(string text) : base(text) {} }
    public sealed class Parent { public string path; public string identity; }
    public sealed class Snapshot {
        public string bytes; public string identity; public Parent[] parents;
        public string acl; public string revision;
    }
    public sealed class Account { public string home; public string sid; }
    internal sealed class Metadata {
        public string Identity; public string Acl; public byte[] Security; public long Size;
        public bool Directory; public RawSecurityDescriptor Descriptor;
    }
    public static class Store {
        private const uint ReadControl = 0x20000, ReadAttributes = 0x80;
        private const uint Reparse = 0x400, DirectoryBit = 0x10;
        private const uint OpenFlags = 0x00200000 | 0x02000000;
        private const string UnsafePath = "Windows learning requires an ordinary canonical path on a local fixed NTFS drive, without links, reparse points or path aliases.";
        private const string UnsafeAcl = "Windows learning cannot verify the required ownership and access protections; existing permissions were not repaired.";
        private const string Conflict = "Learning state, permissions or directory identity changed; read current state before retrying.";
        private const string Uncertain = "Windows learning replacement failed or could not be verified; outcome is uncertain. Preserve recovery files and inspect before retrying.";
        private static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
        private static readonly SecurityIdentifier User = WindowsIdentity.GetCurrent().User;
        private static readonly string UserSid = User.Value;
        private static readonly string[] Trusted = { UserSid, "S-1-5-18", "S-1-5-32-544" };
        // This Windows servicing principal is trusted only above the account
        // home, never as an additional reader of private memory.
        private const string TrustedInstaller = "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464";
        [StructLayout(LayoutKind.Sequential)] private struct Info {
            public uint Attributes; public System.Runtime.InteropServices.ComTypes.FILETIME Creation;
            public System.Runtime.InteropServices.ComTypes.FILETIME Access;
            public System.Runtime.InteropServices.ComTypes.FILETIME Write;
            public uint Volume, SizeHigh, SizeLow, Links, IndexHigh, IndexLow;
        }
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
        private static extern SafeFileHandle CreateFileW(string name, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);
        [DllImport("kernel32.dll", SetLastError=true)]
        private static extern bool GetFileInformationByHandle(SafeFileHandle handle, out Info info);
        [DllImport("kernel32.dll", SetLastError=true)] private static extern uint GetFileType(SafeFileHandle handle);
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
        private static extern uint GetFinalPathNameByHandleW(SafeFileHandle handle, StringBuilder result, uint size, uint flags);
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
        private static extern uint GetLongPathNameW(string path, StringBuilder result, uint size);
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] private static extern uint GetDriveTypeW(string root);
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
        private static extern bool GetVolumeInformationW(string root, StringBuilder volume, uint volumeSize, out uint serial, out uint maxPart, out uint flags, StringBuilder filesystem, uint filesystemSize);
        [DllImport("advapi32.dll", SetLastError=true)]
        private static extern uint GetSecurityInfo(SafeFileHandle handle, uint type, uint information, out IntPtr owner, out IntPtr group, out IntPtr dacl, out IntPtr sacl, out IntPtr descriptor);
        [DllImport("advapi32.dll", SetLastError=true)] private static extern uint GetSecurityDescriptorLength(IntPtr descriptor);
        [DllImport("kernel32.dll")] private static extern IntPtr LocalFree(IntPtr value);
        [DllImport("userenv.dll", CharSet=CharSet.Unicode, SetLastError=true)]
        private static extern bool GetUserProfileDirectoryW(IntPtr token, StringBuilder profile, ref uint size);

        private static void Stop(string message) { throw new StoreError(message); }
        private static bool Equal(string a, string b) { return String.Equals(a, b, StringComparison.Ordinal); }
        private static bool IsTrusted(SecurityIdentifier sid) { return sid != null && Array.IndexOf(Trusted, sid.Value) >= 0; }
        private static bool IsAncestorTrusted(SecurityIdentifier sid, bool aboveHome) { return IsTrusted(sid) || (aboveHome && sid != null && Equal(sid.Value, TrustedInstaller)); }
        private static string Hash(byte[] data) {
            using (SHA256 sha = SHA256.Create()) { return BitConverter.ToString(sha.ComputeHash(data)).Replace("-", "").ToLowerInvariant(); }
        }
        private static string Lexical(string value) {
            if (String.IsNullOrEmpty(value) || value.Length > 240 || !Regex.IsMatch(value, @"^[A-Z]:\\") ||
                Regex.IsMatch(value, "[\\x00-\\x1f<>\"|?*/]") || value.IndexOf(':', 2) >= 0) Stop(UnsafePath);
            Utf8.GetBytes(value); // Reject lone UTF-16 surrogates, including JSON escapes.
            if (value.Length > 3 && value.EndsWith("\\", StringComparison.Ordinal)) Stop(UnsafePath);
            string[] parts = value.Substring(3).Split('\\');
            if (value.Length > 3) foreach (string part in parts) {
                if (part.Length == 0 || part == "." || part == ".." || part.EndsWith(".", StringComparison.Ordinal) ||
                    part.EndsWith(" ", StringComparison.Ordinal) || part.IndexOf('~') >= 0 ||
                    Regex.IsMatch(part, @"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", RegexOptions.IgnoreCase)) Stop(UnsafePath);
            }
            if (!Equal(Path.GetFullPath(value), value)) Stop(UnsafePath);
            return value;
        }
        private static void Volume(string value) {
            string drive = value.Substring(0, 3);
            uint serial, maxPart, flags;
            StringBuilder fs = new StringBuilder(64);
            if (GetDriveTypeW(drive) != 3 || !GetVolumeInformationW(drive, null, 0, out serial, out maxPart, out flags, fs, 64) || !Equal(fs.ToString(), "NTFS")) Stop(UnsafePath);
        }
        private static void Contained(string root, string file) {
            Lexical(root); Lexical(file); Volume(root);
            if (!file.StartsWith(root.EndsWith("\\", StringComparison.Ordinal) ? root : root + "\\", StringComparison.Ordinal)) Stop(UnsafePath);
        }
        private static string[] Paths(string target) {
            Lexical(target);
            List<string> paths = new List<string>();
            string current = target.Substring(0, 3);
            paths.Add(current);
            if (target.Length > 3) foreach (string part in target.Substring(3).Split('\\')) { current = Path.Combine(current, part); paths.Add(current); }
            return paths.ToArray();
        }
        private static SafeFileHandle Open(string file, bool content, bool missingAllowed) {
            SafeFileHandle handle = CreateFileW(file, ReadControl | ReadAttributes | (content ? 0x80000000u : 0u), content ? 1u : 7u, IntPtr.Zero, 3, OpenFlags, IntPtr.Zero);
            if (handle.IsInvalid) {
                int error = Marshal.GetLastWin32Error(); handle.Dispose();
                if (missingAllowed && (error == 2 || error == 3)) return null;
                Stop("Windows learning could not safely open an object or inspect its metadata.");
            }
            return handle;
        }
        private static Metadata Inspect(SafeFileHandle handle, string file) {
            Info info = new Info();
            if (GetFileType(handle) != 1 || !GetFileInformationByHandle(handle, out info) || (info.Attributes & Reparse) != 0 ||
                ((info.Attributes & DirectoryBit) == 0 && info.Links != 1)) Stop(UnsafePath);
            StringBuilder final = new StringBuilder(512);
            uint count = GetFinalPathNameByHandleW(handle, final, (uint)final.Capacity, 0);
            if (count == 0 || count >= final.Capacity || !Equal(final.ToString(), @"\\?\" + file)) Stop(UnsafePath);
            StringBuilder longName = new StringBuilder(512);
            count = GetLongPathNameW(file, longName, (uint)longName.Capacity);
            if (count == 0 || count >= longName.Capacity || !Equal(longName.ToString(), file)) Stop(UnsafePath);
            IntPtr owner, group, dacl, sacl, security;
            if (GetSecurityInfo(handle, 1, 7, out owner, out group, out dacl, out sacl, out security) != 0 || security == IntPtr.Zero) Stop(UnsafeAcl);
            byte[] binary;
            try {
                uint length = GetSecurityDescriptorLength(security);
                if (length == 0 || length > 65536) Stop(UnsafeAcl);
                binary = new byte[(int)length]; Marshal.Copy(security, binary, 0, binary.Length);
            } finally { LocalFree(security); }
            RawSecurityDescriptor descriptor = new RawSecurityDescriptor(binary, 0);
            string acl = descriptor.GetSddlForm(AccessControlSections.Owner | AccessControlSections.Group | AccessControlSections.Access);
            return new Metadata {
                Identity = info.Volume.ToString("x8") + ":" + info.IndexHigh.ToString("x8") + info.IndexLow.ToString("x8") + ":" + info.Attributes.ToString("x8") + ":" + info.Links + ":" + Hash(Utf8.GetBytes(acl)),
                Directory = (info.Attributes & DirectoryBit) != 0,
                Size = ((long)info.SizeHigh << 32) | info.SizeLow,
                Acl = acl, Security = binary, Descriptor = descriptor
            };
        }
        private static Metadata MetadataAt(string file, bool missingAllowed) {
            using (SafeFileHandle handle = Open(file, false, missingAllowed)) { return handle == null ? null : Inspect(handle, file); }
        }
        private static void CheckAcl(Metadata metadata, bool privateContent, bool aboveHome) {
            RawSecurityDescriptor descriptor = metadata.Descriptor;
            if (descriptor.Owner == null || (privateContent ? !Equal(descriptor.Owner.Value, UserSid) : !IsAncestorTrusted(descriptor.Owner, aboveHome)) ||
                (descriptor.ControlFlags & ControlFlags.DiscretionaryAclPresent) == 0 || descriptor.DiscretionaryAcl == null) Stop(UnsafeAcl);
            if (privateContent && (descriptor.ControlFlags & ControlFlags.DiscretionaryAclProtected) == 0) Stop(UnsafeAcl);
            // Before the account home, allowing directory creation does not allow
            // replacement of an already protected descendant. Delete-child does.
            uint mutation = 0x000D0150u | (aboveHome ? 0u : 0x6u) | 0x50000000u;
            foreach (GenericAce generic in descriptor.DiscretionaryAcl) {
                CommonAce ace = generic as CommonAce;
                if (ace == null || ace.IsCallback || (ace.AceQualifier != AceQualifier.AccessAllowed && ace.AceQualifier != AceQualifier.AccessDenied)) Stop(UnsafeAcl);
                if ((ace.AceFlags & AceFlags.InheritOnly) != 0 || ace.AceQualifier == AceQualifier.AccessDenied) continue;
                if (!(privateContent ? IsTrusted(ace.SecurityIdentifier) : IsAncestorTrusted(ace.SecurityIdentifier, aboveHome)) && (privateContent || ((uint)ace.AccessMask & mutation) != 0)) Stop(UnsafeAcl);
            }
        }
        private static List<Parent> Directories(string root, string target, bool privateFile) {
            Lexical(root); Lexical(target); Volume(root);
            List<Parent> parents = new List<Parent>();
            bool foundRoot = false;
            foreach (string directory in Paths(target)) {
                Metadata meta = MetadataAt(directory, true);
                if (meta == null) {
                    if (!foundRoot) Stop(UnsafePath);
                    break;
                }
                if (!meta.Directory) Stop(UnsafePath);
                bool aboveHome = !Equal(directory, root) && !directory.StartsWith(root + "\\", StringComparison.Ordinal);
                if (privateFile) CheckAcl(meta, false, aboveHome);
                parents.Add(new Parent { path = directory, identity = meta.Identity });
                if (Equal(directory, root)) foundRoot = true;
            }
            if (!foundRoot) Stop(UnsafePath);
            return parents;
        }
        private static void SameParents(Parent[] expected) {
            if (expected == null || expected.Length == 0) Stop(Conflict);
            foreach (Parent parent in expected) {
                if (parent == null || String.IsNullOrEmpty(parent.identity)) Stop(Conflict);
                Lexical(parent.path);
                Metadata meta = MetadataAt(parent.path, false);
                if (!meta.Directory || !Equal(meta.Identity, parent.identity)) Stop(Conflict);
            }
        }
        private static void GitAncestors(string file) {
            foreach (string directory in Paths(Path.GetDirectoryName(file))) {
                // Any .git object, including a link, rejects storage. No contents
                // are followed or interpreted; metadata failure is not absence.
                using (SafeFileHandle handle = Open(Path.Combine(directory, ".git"), false, true)) {
                    if (handle != null) Stop("Private memory cannot live inside a Git working tree.");
                }
            }
        }
        public static Account Context() {
            using (WindowsIdentity current = WindowsIdentity.GetCurrent()) {
                uint size = 0; GetUserProfileDirectoryW(current.Token, null, ref size);
                if (size == 0 || size > 32768) Stop("The current Windows account profile could not be resolved.");
                StringBuilder home = new StringBuilder((int)size);
                if (!GetUserProfileDirectoryW(current.Token, home, ref size)) Stop("The current Windows account profile could not be resolved.");
                string result = Lexical(home.ToString());
                Directories(result, result, true);
                return new Account { home = result, sid = current.User.Value };
            }
        }
        public static string Project(string root) { Lexical(root); Directories(root, root, false); return root; }
        public static void Memory(string root, string file) {
            Contained(root, file);
            if (!Equal(file, Path.Combine(root, ".config", "copilot-concierge", "memory.json"))) Stop(UnsafePath);
            Directories(root, Path.GetDirectoryName(file), true); GitAncestors(file);
            Metadata meta = MetadataAt(file, true);
            if (meta != null) { if (meta.Directory) Stop(UnsafePath); CheckAcl(meta, true, false); }
        }
        public static void Source(string root, string file) {
            Contained(root, file);
            List<Parent> parents = Directories(root, Path.GetDirectoryName(file), false);
            Metadata meta = MetadataAt(file, false);
            if (meta.Directory) Stop(UnsafePath);
            SameParents(parents.ToArray());
        }
        public static Snapshot Read(string root, string file, int limit, bool privateFile) {
            if (limit < 1 || limit > 262144) Stop("Invalid Windows learning file limit.");
            Contained(root, file);
            if (privateFile) Memory(root, file);
            List<Parent> parents = Directories(root, Path.GetDirectoryName(file), privateFile);
            using (SafeFileHandle handle = Open(file, true, true)) {
                if (handle == null) {
                    SameParents(parents.ToArray());
                    return new Snapshot { bytes = null, identity = null, parents = parents.ToArray(), acl = null, revision = null };
                }
                Metadata before = Inspect(handle, file);
                if (before.Directory || before.Size > limit) Stop("Learning file is not an ordinary file within its size limit.");
                if (privateFile) CheckAcl(before, true, false); // Before any byte read.
                byte[] data;
                using (FileStream stream = new FileStream(handle, FileAccess.Read, 4096, false)) {
                    byte[] buffer = new byte[limit + 1]; int length = 0;
                    while (length < buffer.Length) { int read = stream.Read(buffer, length, buffer.Length - length); if (read == 0) break; length += read; }
                    if (length > limit) Stop("Learning file exceeds its size limit; preserve it for review.");
                    data = new byte[length]; Buffer.BlockCopy(buffer, 0, data, 0, length);
                    Metadata after = Inspect(handle, file);
                    if (!Equal(before.Identity, after.Identity) || before.Size != after.Size) Stop(Conflict);
                    Metadata pathNow = MetadataAt(file, false);
                    if (!Equal(before.Identity, pathNow.Identity)) Stop(Conflict);
                    SameParents(parents.ToArray());
                }
                return new Snapshot { bytes = Convert.ToBase64String(data), identity = before.Identity, parents = parents.ToArray(), acl = before.Acl, revision = Hash(data) };
            }
        }
        private static FileSecurity PrivateFileSecurity() {
            FileSecurity security = new FileSecurity(); security.SetOwner(User);
            security.SetAccessRuleProtection(true, false);
            security.AddAccessRule(new FileSystemAccessRule(User, FileSystemRights.FullControl, AccessControlType.Allow));
            return security;
        }
        private static DirectorySecurity PrivateDirectorySecurity() {
            DirectorySecurity security = new DirectorySecurity(); security.SetOwner(User);
            security.SetAccessRuleProtection(true, false);
            security.AddAccessRule(new FileSystemAccessRule(User, FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
            return security;
        }
        private static FileStream NewFile(string file, FileSecurity security) {
            return new FileStream(file, FileMode.CreateNew, FileSystemRights.ReadData | FileSystemRights.WriteData | FileSystemRights.ReadPermissions | FileSystemRights.ReadAttributes, FileShare.None, 4096, FileOptions.WriteThrough, security);
        }
        private static void CreateParents(string root, string file, bool privateFile) {
            string target = Path.GetDirectoryName(file);
            foreach (string directory in Paths(target)) {
                Metadata meta = MetadataAt(directory, true);
                if (meta != null) { if (!meta.Directory) Stop(UnsafePath); continue; }
                if (!directory.StartsWith(root + "\\", StringComparison.Ordinal)) Stop(UnsafePath);
                List<Parent> checkedParents = Directories(root, Path.GetDirectoryName(directory), privateFile);
                SameParents(checkedParents.ToArray());
                // Private security is attached at creation; never repair an existing
                // ACL. Repository documentation directories inherit like a checkout.
                if (privateFile) Directory.CreateDirectory(directory, PrivateDirectorySecurity());
                else Directory.CreateDirectory(directory);
                Metadata created = MetadataAt(directory, false);
                if (!created.Directory) Stop(UnsafePath);
                if (privateFile) CheckAcl(created, false, false);
                SameParents(checkedParents.ToArray());
            }
        }
        private static void OriginalShape(string root, string file, Snapshot original) {
            if (original == null || original.parents == null || original.parents.Length == 0 || original.parents.Length > 120 ||
                (original.identity == null) != (original.revision == null) || (original.identity == null) != (original.acl == null) ||
                (original.revision != null && !Regex.IsMatch(original.revision, "^[a-f0-9]{64}$"))) Stop(Conflict);
            string[] chain = Paths(Path.GetDirectoryName(file));
            if (original.parents.Length > chain.Length || (original.identity != null && original.parents.Length != chain.Length)) Stop(Conflict);
            bool foundRoot = false;
            for (int index = 0; index < original.parents.Length; index++) {
                Parent parent = original.parents[index];
                if (parent == null || !Equal(chain[index], parent.path) || String.IsNullOrEmpty(parent.identity)) Stop(Conflict);
                if (Equal(parent.path, root)) foundRoot = true;
            }
            if (!foundRoot) Stop(Conflict);
        }
        private static bool Unpublished(string root, string file, int limit, bool privateFile, Snapshot original, string temp, string tempIdentity) {
            try {
                Snapshot now = Read(root, file, limit, privateFile);
                Metadata staged = MetadataAt(temp, true);
                return Equal(now.identity, original.identity) && Equal(now.revision, original.revision) && Equal(now.acl, original.acl) &&
                    staged != null && tempIdentity != null && Equal(staged.Identity, tempIdentity);
            } catch { return false; }
        }
        public static void Write(string root, string file, int limit, bool privateFile, Snapshot original, string encoded) {
            if (limit < 1 || limit > 262144 || encoded == null || encoded.Length > 349528) Stop("Invalid Windows learning write size.");
            byte[] bytes;
            try { bytes = Convert.FromBase64String(encoded); } catch { throw new StoreError("Invalid Windows learning content encoding."); }
            if (bytes.Length > limit || !Equal(Convert.ToBase64String(bytes), encoded)) Stop("Invalid Windows learning content encoding or size.");
            Contained(root, file);
            if (privateFile) Memory(root, file);
            else if (!Equal(file, Path.Combine(root, "docs", "concierge", "knowledge.md"))) Stop(UnsafePath);
            OriginalShape(root, file, original); SameParents(original.parents);
            CreateParents(root, file, privateFile);
            List<Parent> parents = Directories(root, Path.GetDirectoryName(file), privateFile);
            SameParents(original.parents);
            string temp = Path.Combine(Path.GetDirectoryName(file), ".concierge-" + Guid.NewGuid().ToString("N") + ".tmp");
            string lockPath = Path.Combine(Path.GetDirectoryName(file), "." + Path.GetFileName(file) + ".concierge-lock");
            FileStream lockStream = null;
            string lockIdentity = null, tempIdentity = null;
            bool uncertain = false, published = false;
            try {
                try { lockStream = NewFile(lockPath, PrivateFileSecurity()); }
                catch { throw new StoreError("Learning update is locked or its exclusive lock cannot be created; inspect any stale lock before retrying."); }
                lockIdentity = Inspect(lockStream.SafeFileHandle, lockPath).Identity;
                SameParents(parents.ToArray());
                Snapshot current = Read(root, file, limit, privateFile);
                if (!Equal(current.identity, original.identity) || !Equal(current.revision, original.revision) || !Equal(current.acl, original.acl)) Stop(Conflict);
                // New private files get the explicit current-user-only descriptor.
                // A new repository document inherits its directory's access, as a
                // checkout would. An existing file's verified owner/group/DACL is
                // copied at creation; if the token cannot apply it, no content is written.
                FileSecurity staging = privateFile ? PrivateFileSecurity() : null;
                if (current.acl != null) {
                    staging = new FileSecurity();
                    staging.SetSecurityDescriptorSddlForm(current.acl, AccessControlSections.Owner | AccessControlSections.Group | AccessControlSections.Access);
                }
                FileStream created;
                try { created = NewFile(temp, staging); }
                catch { throw new StoreError(UnsafeAcl); }
                using (FileStream stream = created) {
                    Metadata staged;
                    try { staged = Inspect(stream.SafeFileHandle, temp); }
                    catch { uncertain = true; throw new StoreError(Uncertain); }
                    tempIdentity = staged.Identity; // Also permits verified cleanup after a partial staging write.
                    if (privateFile) CheckAcl(staged, true, false);
                    if (current.acl != null && !Equal(staged.Acl, current.acl)) Stop(UnsafeAcl);
                    stream.Write(bytes, 0, bytes.Length); stream.Flush(true);
                    tempIdentity = Inspect(stream.SafeFileHandle, temp).Identity;
                }
                current = Read(root, file, limit, privateFile);
                if (!Equal(current.identity, original.identity) || !Equal(current.revision, original.revision) || !Equal(current.acl, original.acl)) Stop(Conflict);
                SameParents(original.parents); SameParents(parents.ToArray());
                if (privateFile) Memory(root, file);
                if (!Equal(MetadataAt(temp, false).Identity, tempIdentity)) Stop(Conflict);
                try {
                    if (original.identity == null) File.Move(temp, file);
                    else File.Replace(temp, file, null, false);
                    published = true;
                } catch {
                    // Classify from observed state, not the error code. Only an
                    // unchanged destination plus intact staged bytes is a plain
                    // conflict (for example, a concurrent reader's sharing lock).
                    if (!Unpublished(root, file, limit, privateFile, original, temp, tempIdentity)) { uncertain = true; throw new StoreError(Uncertain); }
                    Stop(Conflict);
                }
                try {
                    Snapshot completed = Read(root, file, limit, privateFile);
                    if (!Equal(completed.revision, Hash(bytes)) || (original.acl != null && !Equal(completed.acl, original.acl))) Stop(Uncertain);
                    SameParents(parents.ToArray());
                } catch { uncertain = true; throw new StoreError(Uncertain); }
            } finally {
                if (lockStream != null) lockStream.Dispose();
                // Failed ReplaceFile can leave the only surviving copy at temp.
                // Keep both recovery material and the stale lock when uncertain.
                if (!uncertain) {
                    SameParents(parents.ToArray());
                    if (!published && tempIdentity != null) {
                        Metadata remaining = MetadataAt(temp, true);
                        if (remaining != null) { if (!Equal(remaining.Identity, tempIdentity)) Stop(Conflict); File.Delete(temp); }
                    }
                    if (lockIdentity != null) {
                        Metadata remainingLock = MetadataAt(lockPath, false);
                        if (!Equal(remainingLock.Identity, lockIdentity)) Stop(Conflict);
                        File.Delete(lockPath);
                    }
                }
            }
        }
    }
}
'@
    $inputStream = [Console]::OpenStandardInput()
    $inputBuffer = New-Object byte[] 800001
    $length = 0
    while ($length -lt $inputBuffer.Length) {
        $read = $inputStream.Read($inputBuffer, $length, $inputBuffer.Length - $length)
        if ($read -eq 0) { break }
        $length += $read
    }
    if ($length -gt 800000 -or $length -eq 0) { throw 'invalid request' }
    $request = $encoding.GetString($inputBuffer, 0, $length) | ConvertFrom-Json
    function Assert-Object($value, [string[]]$keys) {
        if ($null -eq $value -or $value -isnot [System.Management.Automation.PSCustomObject]) { throw 'invalid request' }
        $actual = @($value.PSObject.Properties.Name)
        if ($actual.Count -ne $keys.Count) { throw 'invalid request' }
        foreach ($key in $actual) { if ($keys -cnotcontains $key) { throw 'invalid request' } }
    }
    function Assert-String($value) { if ($value -isnot [string] -or $value.Length -gt 65536) { throw 'invalid request' } }
    function Assert-NullableString($value) { if ($null -ne $value) { Assert-String $value } }
    if ($null -eq $request -or $request -isnot [System.Management.Automation.PSCustomObject] -or
        $request.PSObject.Properties.Name -cnotcontains 'op') { throw 'invalid request' }
    Assert-String $request.op
    switch -CaseSensitive ($request.op) {
        'context' {
            Assert-Object $request @('op')
            $result = [ConciergeLearning.Store]::Context()
        }
        'project' {
            Assert-Object $request @('op', 'root'); Assert-String $request.root
            $result = @{ root = [ConciergeLearning.Store]::Project($request.root) }
        }
        'memory' {
            Assert-Object $request @('op', 'root', 'file'); Assert-String $request.root; Assert-String $request.file
            [ConciergeLearning.Store]::Memory($request.root, $request.file); $result = @{}
        }
        'source' {
            Assert-Object $request @('op', 'root', 'file'); Assert-String $request.root; Assert-String $request.file
            [ConciergeLearning.Store]::Source($request.root, $request.file); $result = @{}
        }
        { $_ -ceq 'read' -or $_ -ceq 'write' } {
            $keys = @('op', 'root', 'file', 'limit', 'privateFile')
            if ($request.op -ceq 'write') { $keys += @('original', 'bytes') }
            Assert-Object $request $keys; Assert-String $request.root; Assert-String $request.file
            if (($request.limit -isnot [int] -and $request.limit -isnot [long]) -or $request.limit -lt 1 -or $request.limit -gt 262144 -or
                $request.privateFile -isnot [bool]) { throw 'invalid request' }
            if ($request.op -ceq 'read') {
                $result = [ConciergeLearning.Store]::Read($request.root, $request.file, $request.limit, $request.privateFile)
            } else {
                if ($request.bytes -isnot [string]) { throw 'invalid request' }
                Assert-Object $request.original @('identity', 'parents', 'acl', 'revision')
                Assert-NullableString $request.original.identity; Assert-NullableString $request.original.acl; Assert-NullableString $request.original.revision
                if ($request.original.parents -isnot [array] -or $request.original.parents.Count -gt 120) { throw 'invalid request' }
                $original = New-Object ConciergeLearning.Snapshot
                $original.identity = $request.original.identity; $original.acl = $request.original.acl; $original.revision = $request.original.revision
                $parents = New-Object 'System.Collections.Generic.List[ConciergeLearning.Parent]'
                foreach ($entry in $request.original.parents) {
                    Assert-Object $entry @('path', 'identity'); Assert-String $entry.path; Assert-String $entry.identity
                    $parent = New-Object ConciergeLearning.Parent; $parent.path = $entry.path; $parent.identity = $entry.identity; $parents.Add($parent)
                }
                $original.parents = $parents.ToArray()
                [ConciergeLearning.Store]::Write($request.root, $request.file, $request.limit, $request.privateFile, $original, $request.bytes)
                $result = @{}
            }
        }
        default { throw 'invalid request' }
    }
    $response = @{ ok = $true; result = $result } | ConvertTo-Json -Depth 32 -Compress
    if ($encoding.GetByteCount($response) -gt 800000) { throw 'oversized response' }
    [Console]::WriteLine($response)
    exit 0
} catch {
    $message = 'Windows learning is unavailable: host policy, request validation or native safety checks prevented a confirmed operation. Re-read state before retrying a write.'
    $exception = $_.Exception
    while ($null -ne $exception) {
        if ($exception.GetType().FullName -eq 'ConciergeLearning.StoreError') { $message = $exception.Message; break }
        $exception = $exception.InnerException
    }
    [Console]::WriteLine((@{ ok = $false; error = $message } | ConvertTo-Json -Depth 4 -Compress))
    exit 1
}
