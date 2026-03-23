import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { getDb } from './schema';
import type { ConversationStatus, ChatMessageType } from '@pelagora/pim-protocol';

interface ConversationRow {
  id: string;
  ref_id: string;
  ref_name: string;
  counterpart_beacon_id: string;
  role: 'buyer' | 'seller';
  status: ConversationStatus;
  closed_by: string | null;
  closed_reason: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_beacon_id: string;
  message_type: ChatMessageType;
  content: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  refId: string;
  refName: string;
  counterpartBeaconId: string;
  role: 'buyer' | 'seller';
  status: ConversationStatus;
  closedBy: string | null;
  closedReason: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderBeaconId: string;
  messageType: ChatMessageType;
  content: string | null;
  amount: number | null;
  currency: string;
  createdAt: string;
}

export interface ConversationWithPreview extends Conversation {
  lastMessage?: ConversationMessage;
}

function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    refId: row.ref_id as string,
    refName: row.ref_name as string,
    counterpartBeaconId: row.counterpart_beacon_id as string,
    role: row.role as 'buyer' | 'seller',
    status: row.status as ConversationStatus,
    closedBy: (row.closed_by as string) || null,
    closedReason: (row.closed_reason as string) || null,
    lastMessageAt: row.last_message_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToMessage(row: Record<string, unknown>): ConversationMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderBeaconId: row.sender_beacon_id as string,
    messageType: row.message_type as ChatMessageType,
    content: (row.content as string) || null,
    amount: row.amount != null ? (row.amount as number) : null,
    currency: (row.currency as string) || 'USD',
    createdAt: row.created_at as string,
  };
}

export class ConversationQueries {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDb();
  }

  get(id: string): Conversation | undefined {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    return row ? rowToConversation(row as Record<string, unknown>) : undefined;
  }

  getOrCreate(
    refId: string,
    refName: string,
    counterpartBeaconId: string,
    role: 'buyer' | 'seller',
  ): Conversation {
    // Try exact match first
    const existing = this.db.prepare(
      'SELECT * FROM conversations WHERE ref_id = ? AND counterpart_beacon_id = ?'
    ).get(refId, counterpartBeaconId);

    if (existing) {
      return rowToConversation(existing as Record<string, unknown>);
    }

    // Fallback: match by ref_id + role (counterpart beacon may have changed)
    const byRefAndRole = this.db.prepare(
      'SELECT * FROM conversations WHERE ref_id = ? AND role = ?'
    ).get(refId, role);

    if (byRefAndRole) {
      // Update the counterpart beacon ID to the latest
      this.db.prepare(
        'UPDATE conversations SET counterpart_beacon_id = ?, updated_at = ? WHERE id = ?'
      ).run(counterpartBeaconId, new Date().toISOString(), (byRefAndRole as Record<string, unknown>).id);
      return rowToConversation(byRefAndRole as Record<string, unknown>);
    }

    // Create new
    const id = uuid();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO conversations (id, ref_id, ref_name, counterpart_beacon_id, role, status, last_message_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `).run(id, refId, refName, counterpartBeaconId, role, now, now, now);

    return this.get(id)!;
  }

  list(role?: string): ConversationWithPreview[] {
    let rows: unknown[];
    if (role === 'buyer') {
      rows = this.db.prepare(
        "SELECT * FROM conversations WHERE role = 'buyer' AND status = 'open' ORDER BY last_message_at DESC"
      ).all();
    } else if (role === 'seller') {
      rows = this.db.prepare(
        "SELECT * FROM conversations WHERE role = 'seller' AND status = 'open' ORDER BY last_message_at DESC"
      ).all();
    } else if (role === 'closed') {
      rows = this.db.prepare(
        "SELECT * FROM conversations WHERE status = 'closed' ORDER BY updated_at DESC"
      ).all();
    } else {
      rows = this.db.prepare(
        "SELECT * FROM conversations ORDER BY last_message_at DESC"
      ).all();
    }

    return (rows as Record<string, unknown>[]).map(row => {
      const conv = rowToConversation(row);
      // Get last message
      const lastMsg = this.db.prepare(
        'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(conv.id);
      return {
        ...conv,
        lastMessage: lastMsg ? rowToMessage(lastMsg as Record<string, unknown>) : undefined,
      };
    });
  }

  getMessages(conversationId: string): ConversationMessage[] {
    const rows = this.db.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId);
    return (rows as Record<string, unknown>[]).map(rowToMessage);
  }

  addMessage(data: {
    id?: string;
    conversationId: string;
    senderBeaconId: string;
    messageType: ChatMessageType;
    content?: string;
    amount?: number;
    currency?: string;
  }): ConversationMessage {
    const id = data.id || uuid();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT OR IGNORE INTO conversation_messages (id, conversation_id, sender_beacon_id, message_type, content, amount, currency, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.conversationId, data.senderBeaconId, data.messageType, data.content || null, data.amount || null, data.currency || 'USD', now);

    // Update conversation's last_message_at
    this.db.prepare(
      "UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?"
    ).run(now, now, data.conversationId);

    return {
      id,
      conversationId: data.conversationId,
      senderBeaconId: data.senderBeaconId,
      messageType: data.messageType,
      content: data.content || null,
      amount: data.amount || null,
      currency: data.currency || 'USD',
      createdAt: now,
    };
  }

  close(id: string, closedBy: string, closedReason?: string): Conversation | undefined {
    const now = new Date().toISOString();
    this.db.prepare(
      "UPDATE conversations SET status = 'closed', closed_by = ?, closed_reason = ?, updated_at = ? WHERE id = ?"
    ).run(closedBy, closedReason || null, now, id);
    return this.get(id);
  }

  reopen(id: string): Conversation | undefined {
    const now = new Date().toISOString();
    this.db.prepare(
      "UPDATE conversations SET status = 'open', closed_by = NULL, updated_at = ? WHERE id = ?"
    ).run(now, id);
    return this.get(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    return result.changes > 0;
  }

  listForRef(refId: string): Conversation[] {
    const rows = this.db.prepare(
      'SELECT * FROM conversations WHERE ref_id = ? ORDER BY last_message_at DESC'
    ).all(refId);
    return (rows as Record<string, unknown>[]).map(rowToConversation);
  }

  /** Check if there's a pending offer in a conversation */
  hasPendingOffer(conversationId: string): boolean {
    // A pending offer exists if the last offer/counter message hasn't been followed by accept/reject/withdraw
    const messages = this.getMessages(conversationId);
    let lastOfferType: string | null = null;
    for (const msg of messages) {
      if (msg.messageType === 'offer' || msg.messageType === 'counter') {
        lastOfferType = msg.messageType;
      } else if (msg.messageType === 'accept' || msg.messageType === 'reject' || msg.messageType === 'withdraw') {
        lastOfferType = null;
      }
    }
    return lastOfferType !== null;
  }

  /** Get the current offer amount (last offer or counter) */
  getCurrentOfferAmount(conversationId: string): { amount: number; currency: string } | null {
    const msg = this.db.prepare(
      "SELECT amount, currency FROM conversation_messages WHERE conversation_id = ? AND message_type IN ('offer', 'counter') ORDER BY created_at DESC LIMIT 1"
    ).get(conversationId) as { amount: number; currency: string } | undefined;
    return msg ? { amount: msg.amount, currency: msg.currency } : null;
  }
}
