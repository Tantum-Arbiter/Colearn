"""Private-entry isolation regressions; synthetic checkouts and no provider calls."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[2]


class PrivateReview(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp.name).resolve() / 'Colearn'
        original = json.loads((SOURCE / '.git/founder-vault-project-install.json').read_text())
        files = {}
        for name in original['files']:
            path = Path(name)
            target = self.repo / path.relative_to(SOURCE)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(path.read_bytes())
            files[str(target)] = hashlib.sha256(target.read_bytes()).hexdigest()
        self.entry = self.repo / '.git/founder-vault-review/launch_review.py'
        self.entry.parent.mkdir(parents=True)
        self.entry.write_bytes((SOURCE / '.git/founder-vault-review/launch_review.py').read_bytes())
        self.record = self.repo / '.git/founder-vault-project-install.json'
        self.record.write_text(json.dumps({'schema_version': 1, 'repo': str(self.repo), 'files': files}))
    def tearDown(self):
        self.temp.cleanup()
    def check(self, *extra):
        return subprocess.run([sys.executable, '-I', str(self.entry), '--client', 'codex', '--check', *extra],
                              capture_output=True, text=True, timeout=10)
    def test_valid_install(self):
        self.assertEqual(0, self.check().returncode)
    def test_other_project_rejected(self):
        self.assertEqual(2, self.check('--repo', str(self.repo.parent)).returncode)
    def test_changed_public_source_never_executes(self):
        marker = self.repo / 'canary'
        path = self.repo / 'tools/ai-review/launch_review.py'
        path.write_text('from pathlib import Path\nPath(' + repr(str(marker)) + ').touch()\n' + path.read_text())
        self.assertEqual(2, self.check().returncode)
        self.assertFalse(marker.exists())
    def test_symlinked_skill_rejected(self):
        path = self.repo / '.claude/skills/fv-review/SKILL.md'
        other = self.repo / 'copy';other.write_bytes(path.read_bytes());path.unlink();path.symlink_to(other)
        self.assertEqual(2, self.check().returncode)
    def test_missing_record_rejected(self):
        self.record.unlink()
        self.assertEqual(2, self.check().returncode)
    def test_empty_ownership_set_rejected(self):
        record = json.loads(self.record.read_text());record['files'] = {};self.record.write_text(json.dumps(record))
        self.assertEqual(2, self.check().returncode)


if __name__ == '__main__':
    unittest.main()
