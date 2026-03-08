/**
 * Skill Registry — tracks installed skills in SQLite and provides API routes.
 */

import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { SkillManifest } from '@reffo/protocol';

export interface InstalledSkill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string | null;
  tags: string | null;
  enabled: boolean;
  installedAt: string;
}

export class SkillRegistry {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /** Create the skills_installed table */
  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills_installed (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        icon TEXT,
        tags TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        installed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  /** Insert or update a skill record */
  upsert(manifest: SkillManifest): void {
    const existing = this.get(manifest.id);
    if (existing) {
      this.db.prepare(`
        UPDATE skills_installed
        SET name = ?, version = ?, description = ?, author = ?, icon = ?, tags = ?
        WHERE id = ?
      `).run(
        manifest.name,
        manifest.version,
        manifest.description,
        manifest.author,
        manifest.icon || null,
        manifest.tags ? JSON.stringify(manifest.tags) : null,
        manifest.id,
      );
    } else {
      this.db.prepare(`
        INSERT INTO skills_installed (id, name, version, description, author, icon, tags, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        manifest.id,
        manifest.name,
        manifest.version,
        manifest.description,
        manifest.author,
        manifest.icon || null,
        manifest.tags ? JSON.stringify(manifest.tags) : null,
      );
    }
  }

  /** Get a single installed skill */
  get(id: string): InstalledSkill | undefined {
    const row = this.db.prepare('SELECT * FROM skills_installed WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToSkill(row) : undefined;
  }

  /** List all installed skills */
  list(): InstalledSkill[] {
    const rows = this.db.prepare('SELECT * FROM skills_installed ORDER BY installed_at DESC').all() as Record<string, unknown>[];
    return rows.map(r => this.rowToSkill(r));
  }

  /** Enable or disable a skill */
  setEnabled(id: string, enabled: boolean): InstalledSkill | undefined {
    const existing = this.get(id);
    if (!existing) return undefined;
    this.db.prepare('UPDATE skills_installed SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    return this.get(id);
  }

  /** Remove a skill from the registry */
  remove(id: string): boolean {
    const result = this.db.prepare('DELETE FROM skills_installed WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToSkill(row: Record<string, unknown>): InstalledSkill {
    return {
      id: row.id as string,
      name: row.name as string,
      version: row.version as string,
      description: row.description as string,
      author: row.author as string,
      icon: row.icon as string | null,
      tags: row.tags as string | null,
      enabled: !!(row.enabled as number),
      installedAt: row.installed_at as string,
    };
  }
}

/** Express router for skill management API */
export function createSkillRegistryRouter(registry: SkillRegistry): Router {
  const router = Router();

  // GET /skills — list installed skills
  router.get('/', (_req, res) => {
    const skills = registry.list();
    res.json(skills.map(s => ({
      ...s,
      tags: s.tags ? JSON.parse(s.tags) : [],
    })));
  });

  // GET /skills/:id — get skill details
  router.get('/:id', (req, res) => {
    const skill = registry.get(req.params.id);
    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }
    res.json({
      ...skill,
      tags: skill.tags ? JSON.parse(skill.tags) : [],
    });
  });

  // PATCH /skills/:id — enable/disable
  router.patch('/:id', (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled (boolean) is required' });
      return;
    }
    const skill = registry.setEnabled(req.params.id, enabled);
    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }
    res.json({
      ...skill,
      tags: skill.tags ? JSON.parse(skill.tags) : [],
    });
  });

  // DELETE /skills/:id — uninstall (remove from registry)
  router.delete('/:id', (req, res) => {
    const removed = registry.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }
    res.status(204).send();
  });

  return router;
}
