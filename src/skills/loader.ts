/**
 * Skill Loader — discovers and loads skill plugins on startup.
 *
 * Skills are discovered from:
 * 1. node_modules/@pelagora/skill-* packages
 * 2. Local skills/ directory (for development)
 *
 * Each skill must export a default Skill object.
 */

import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import type Database from 'better-sqlite3';
import type { Skill, SkillContext } from '@pelagora/pim-protocol';
import { DhtDiscovery } from '../dht';
import { SkillRegistry } from './registry';

export class SkillLoader {
  private skills: Map<string, Skill> = new Map();
  private db: Database.Database;
  private beaconId: string;
  private dht: DhtDiscovery;
  private registry: SkillRegistry;

  constructor(db: Database.Database, beaconId: string, dht: DhtDiscovery) {
    this.db = db;
    this.beaconId = beaconId;
    this.dht = dht;
    this.registry = new SkillRegistry(db);
  }

  /** Discover and load all skills */
  async loadAll(app: Express): Promise<void> {
    // Ensure registry table exists
    this.registry.migrate();

    const discovered = this.discoverSkills();

    for (const skillPath of discovered) {
      try {
        const skill = await this.loadSkill(skillPath);
        if (skill) {
          this.registerSkill(skill, app);
        }
      } catch (err) {
        console.error(`[Skills] Failed to load skill from ${skillPath}:`, err);
      }
    }

    console.log(`[Skills] Loaded ${this.skills.size} skill(s): ${[...this.skills.keys()].join(', ') || 'none'}`);
  }

  /** Discover skill packages from node_modules and local skills/ directory */
  private discoverSkills(): string[] {
    const paths: string[] = [];
    const root = process.cwd();

    // 1. Check node_modules/@pelagora/skill-*
    const pelagoraModules = path.join(root, 'node_modules', '@pelagora');
    if (fs.existsSync(pelagoraModules)) {
      try {
        const entries = fs.readdirSync(pelagoraModules, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('skill-')) {
            paths.push(path.join(pelagoraModules, entry.name));
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // 2. Check local skills/ directory
    const localSkills = path.join(root, 'skills');
    if (fs.existsSync(localSkills)) {
      try {
        const entries = fs.readdirSync(localSkills, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            paths.push(path.join(localSkills, entry.name));
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return paths;
  }

  /** Load a single skill from a path */
  private async loadSkill(skillPath: string): Promise<Skill | null> {
    // Try to load the skill's main export
    try {
      const mod = require(skillPath);
      const skill: Skill = mod.default || mod;

      if (!skill.manifest || !skill.manifest.id) {
        console.warn(`[Skills] Invalid skill at ${skillPath}: missing manifest`);
        return null;
      }

      return skill;
    } catch (err) {
      console.error(`[Skills] Could not require ${skillPath}:`, err);
      return null;
    }
  }

  /** Register a loaded skill — run migrations, mount routes, register DHT handlers */
  private registerSkill(skill: Skill, app: Express): void {
    const { id } = skill.manifest;

    if (this.skills.has(id)) {
      console.warn(`[Skills] Duplicate skill ID: ${id}, skipping`);
      return;
    }

    // 1. Run migrations
    try {
      skill.migrate(this.db);
      console.log(`[Skills] Migrated: ${id}`);
    } catch (err) {
      console.error(`[Skills] Migration failed for ${id}:`, err);
      return;
    }

    // 2. Create skill context
    const ctx = this.createContext(skill);

    // 3. Mount Express routes at /skills/{skill-id}/
    try {
      const router = skill.createRouter(ctx) as import('express').Router;
      app.use(`/skills/${id}`, router);
      console.log(`[Skills] Routes mounted: /skills/${id}/`);
    } catch (err) {
      console.error(`[Skills] Route creation failed for ${id}:`, err);
      return;
    }

    // 4. Register DHT handlers
    if (skill.registerDht) {
      try {
        skill.registerDht(ctx);
        console.log(`[Skills] DHT handlers registered: ${id}`);
      } catch (err) {
        console.error(`[Skills] DHT registration failed for ${id}:`, err);
      }
    }

    // 5. Store in registry
    this.registry.upsert(skill.manifest);
    this.skills.set(id, skill);
  }

  /** Build a SkillContext for the given skill */
  private createContext(skill: Skill): SkillContext {
    const dht = this.dht;
    const beaconId = this.beaconId;
    const db = this.db;

    return {
      db,
      beaconId,
      dht: {
        sendMessage(targetBeaconId: string, message: unknown): void {
          dht.sendToPeer(targetBeaconId, {
            type: `skill:${skill.manifest.id}`,
            beaconId,
            payload: message,
          });
        },
        onMessage(type: string, handler: (fromBeaconId: string, payload: unknown) => void): void {
          dht.registerMessageHandler(`skill:${skill.manifest.id}:${type}`, handler);
        },
        broadcastMessage(message: unknown): void {
          dht.broadcastToPeers({
            type: `skill:${skill.manifest.id}`,
            beaconId,
            payload: message,
          });
        },
      },
    };
  }

  /** Get all loaded skills */
  getSkills(): Map<string, Skill> {
    return this.skills;
  }

  /** Get the registry for API access */
  getRegistry(): SkillRegistry {
    return this.registry;
  }
}
