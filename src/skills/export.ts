/**
 * Skill Export API — serves cross-platform distribution artifacts.
 *
 * GET /skills/:id/export/:format
 *   - clawhub → SKILL.md
 *   - openapi → openapi.json
 *   - claude-plugin → claude-plugin.json
 */

import { Router } from 'express';
import type { Skill } from '@reffo/protocol';

export function createSkillExportRouter(skills: Map<string, Skill>): Router {
  const router = Router();

  router.get('/:id/export/:format', (req, res) => {
    const skill = skills.get(req.params.id);
    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    const distribution = skill.getDistribution?.();
    if (!distribution) {
      res.status(404).json({ error: 'Skill has no distribution artifacts' });
      return;
    }

    switch (req.params.format) {
      case 'clawhub':
        if (!distribution.clawHubSkillMd) {
          res.status(404).json({ error: 'No ClawHub SKILL.md available' });
          return;
        }
        res.type('text/markdown').send(distribution.clawHubSkillMd);
        break;

      case 'openapi':
        if (!distribution.openApiSpec) {
          res.status(404).json({ error: 'No OpenAPI spec available' });
          return;
        }
        res.json(distribution.openApiSpec);
        break;

      case 'claude-plugin':
        if (!distribution.claudePluginManifest) {
          res.status(404).json({ error: 'No Claude plugin manifest available' });
          return;
        }
        res.json(distribution.claudePluginManifest);
        break;

      default:
        res.status(400).json({ error: `Unknown format: ${req.params.format}. Use: clawhub, openapi, claude-plugin` });
    }
  });

  return router;
}
