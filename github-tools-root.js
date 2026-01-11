(function (Scratch) {
  'use strict';

  if (!Scratch || !Scratch.vm) {
    console.error('Scratch VM not found');
    return;
  }

  class GitHubToolsRoot {
    constructor() {
      this._token = '';
      this._owner = '';
      this._repo = '';
      this._branch = 'main';
    }

    getInfo() {
      return {
        id: 'githubToolsRoot',
        name: 'GitHub Tools (Root)',
        color1: '#4C8EDA',
        color2: '#3A6AA8',
        color3: '#2B4E7A',
        blocks: [
          {
            opcode: 'setGitHubConfig',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set GitHub token [TOKEN] owner [OWNER] repo [REPO] branch [BRANCH]',
            arguments: {
              TOKEN: { type: Scratch.ArgumentType.STRING, defaultValue: 'ghp_...' },
              OWNER: { type: Scratch.ArgumentType.STRING, defaultValue: 'vbscode123' },
              REPO: { type: Scratch.ArgumentType.STRING, defaultValue: 'penguinmod-projects' },
              BRANCH: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }
            }
          },
          {
            opcode: 'uploadProjectFromUrl',
            blockType: Scratch.BlockType.REPORTER,
            text: 'upload file from URL [URL] as [PATH]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://example.com/project.pmp' },
              PATH: { type: Scratch.ArgumentType.STRING, defaultValue: 'project.pmp' }
            }
          },
          {
            opcode: 'makeRawUrl',
            blockType: Scratch.BlockType.REPORTER,
            text: 'raw GitHub URL for [PATH]',
            arguments: {
              PATH: { type: Scratch.ArgumentType.STRING, defaultValue: 'project.pmp' }
            }
          },
          {
            opcode: 'downloadFileFromUrl',
            blockType: Scratch.BlockType.COMMAND,
            text: 'download URL [URL] as [FILENAME]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://raw.githubusercontent.com/...' },
              FILENAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'project.pmp' }
            }
          },
          {
            opcode: 'pickAndUploadFile',
            blockType: Scratch.BlockType.REPORTER,
            text: 'pick file and upload as [PATH]',
            arguments: {
              PATH: { type: Scratch.ArgumentType.STRING, defaultValue: 'file.pmp' }
            }
          }
        ]
      };
    }

    // ---------------- Helpers ----------------

    _isConfigured() {
      return this._token && this._owner && this._repo;
    }

    _apiUrl(path) {
      return `https://api.github.com/repos/${this._owner}/${this._repo}/contents/${encodeURIComponent(path)}`;
    }

    _rawUrl(path) {
      return `https://raw.githubusercontent.com/${this._owner}/${this._repo}/${this._branch}/${path}`;
    }

    _bufToB64(buf) {
      const u = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
      return btoa(s);
    }

    // ---------------- Upload core ----------------

    _upload(path, base64, msg) {
      const api = this._apiUrl(path);
      const token = this._token;
      const branch = this._branch;
      const raw = this._rawUrl(path);

      return fetch(api, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github+json'
        }
      })
        .then(r => r.ok ? r.json() : null)
        .then(existing => {
          const body = {
            message: msg,
            content: base64,
            branch: branch
          };
          if (existing && existing.sha) body.sha = existing.sha;

          return fetch(api, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify(body)
          });
        })
        .then(r => {
          if (!r || !r.ok) return '';
          return raw;
        })
        .catch(() => '');
    }

    // ---------------- Blocks ----------------

    setGitHubConfig(args) {
      this._token = String(args.TOKEN).trim();
      this._owner = String(args.OWNER).trim();
      this._repo = String(args.REPO).trim();
      this._branch = String(args.BRANCH).trim() || 'main';
    }

    uploadProjectFromUrl(args) {
      if (!this._isConfigured()) return '';
      const url = String(args.URL).trim();
      const path = String(args.PATH).trim() || 'project.pmp';

      return (async () => {
        try {
          const r = await fetch(url);
          if (!r.ok) return '';
          const buf = await r.arrayBuffer();
          const b64 = this._bufToB64(buf);
          return await this._upload(path, b64, `Upload from URL to ${path}`);
        } catch {
          return '';
        }
      })();
    }

    makeRawUrl(args) {
      return this._rawUrl(String(args.PATH).trim());
    }

    downloadFileFromUrl(args) {
      const a = document.createElement('a');
      a.href = String(args.URL).trim();
      a.download = String(args.FILENAME).trim();
      a.click();
    }

    pickAndUploadFile(args) {
      if (!this._isConfigured()) return '';

      const path = String(args.PATH).trim() || 'file.pmp';

      return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';

        input.onchange = async e => {
          const file = e.target.files[0];
          if (!file) return resolve('');

          try {
            const buf = await file.arrayBuffer();
            const b64 = this._bufToB64(buf);
            const url = await this._upload(path, b64, `Upload ${file.name} to ${path}`);
            resolve(url || '');
          } catch {
            resolve('');
          }
        };

        input.click();
      });
    }
  }

  Scratch.extensions.register(new GitHubToolsRoot());
})(Scratch);
