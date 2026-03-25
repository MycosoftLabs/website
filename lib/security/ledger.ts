import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// AES encryption key for payload
const ENCRYPTION_KEY = process.env.LEDGER_ENCRYPTION_KEY || 'default-secret-key-replace-me-12';
const IV_LENGTH = 16;

export interface IncidentPayload {
  incident_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  action: string;
  actor: string;
  timestamp: string;
  related_events?: any[];
}

export class IncidentBlock {
  public index: number;
  public timestamp: string;
  public encryptedData: string;
  public previousHash: string;
  public hash: string;
  public signature: string;

  constructor(
    index: number,
    timestamp: string,
    encryptedData: string,
    previousHash: string = ''
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.encryptedData = encryptedData;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.signature = this.signBlock();
  }

  calculateHash(): string {
    return crypto
      .createHash('sha256')
      .update(this.index + this.previousHash + this.timestamp + this.encryptedData)
      .digest('hex');
  }

  signBlock(): string {
    // Basic HMAC signature to prove block integrity by MAS/MINDEX
    return crypto
      .createHmac('sha256', ENCRYPTION_KEY)
      .update(this.hash)
      .digest('hex');
  }
}

export class SecurityLedger {
  private chain: IncidentBlock[];
  private ledgerPath: string;

  constructor() {
    this.chain = [];
    this.ledgerPath = path.join(process.cwd(), 'data', 'incident_ledger.json');
    this.initializeLedger();
  }

  private initializeLedger() {
    const dataDir = path.dirname(this.ledgerPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(this.ledgerPath)) {
      try {
        const fileData = fs.readFileSync(this.ledgerPath, 'utf8');
        const parsedData = JSON.parse(fileData);
        // Reconstruct classes
        this.chain = parsedData.map((b: any) => {
          const block = new IncidentBlock(b.index, b.timestamp, b.encryptedData, b.previousHash);
          block.hash = b.hash;
          block.signature = b.signature;
          return block;
        });
      } catch (err) {
        console.error('CRITICAL: Failed to parse existing incident ledger.', err);
        this.chain = [this.createGenesisBlock()];
      }
    } else {
      const genesis = this.createGenesisBlock();
      this.chain = [genesis];
      this.saveLedger(genesis);
    }
  }

  private createGenesisBlock(): IncidentBlock {
    const genesisPayload = this.encryptPayload({
      incident_id: 'GENESIS-000',
      title: 'Ledger Initialized',
      description: 'Security incident blockchain initialized.',
      severity: 'info',
      status: 'system',
      action: 'init',
      actor: 'system',
      timestamp: new Date().toISOString()
    });
    return new IncidentBlock(0, new Date().toISOString(), genesisPayload, '0');
  }

  private getLatestBlock(): IncidentBlock {
    return this.chain[this.chain.length - 1];
  }

  private saveLedger(newBlock?: IncidentBlock) {
    fs.writeFileSync(this.ledgerPath, JSON.stringify(this.chain, null, 2));
    
    // In a real environment, trigger MAS synchronization and MINDEX durable storage:
    this.syncToMindex(newBlock);
  }

  private async syncToMindex(block?: IncidentBlock) {
    // Emit event or webhook to MAS/MINDEX to mirror ledger modifications
    // (Mocked integration point for MAS interaction system)
    console.log('[MAS/MINDEX] Syncing cryptographic ledger update. Chain length: ', this.chain.length);
    if (block && supabaseUrl) {
      console.log('[SUPABASE] Syncing block index: ', block.index);
      try {
        const { error } = await supabase.from('security_ledger').insert({
          index: block.index,
          timestamp: block.timestamp,
          hash: block.hash,
          previous_hash: block.previousHash,
          signature: block.signature,
          encrypted_data: block.encryptedData
        });
        if (error) console.error('[Supabase Sync] Error syncing to supabase:', error);
      } catch(err) {
        console.error('[Supabase Sync] Exception syncing to supabase:', err);
      }
    }
  }

  public encryptPayload(payload: IncidentPayload): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let encrypted = cipher.update(JSON.stringify(payload));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  public decryptPayload(text: string): IncidentPayload | null {
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift() as string, 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return JSON.parse(decrypted.toString());
    } catch(e) {
      console.error('Failed to decrypt ledger payload', e);
      return null;
    }
  }

  public addIncident(payload: IncidentPayload): IncidentBlock {
    const previousBlock = this.getLatestBlock();
    const encryptedData = this.encryptPayload(payload);
    const newBlock = new IncidentBlock(
      previousBlock.index + 1,
      payload.timestamp,
      encryptedData,
      previousBlock.hash
    );

    this.chain.push(newBlock);
    this.saveLedger(newBlock);
    return newBlock;
  }

  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
      
      const expectedSignature = crypto.createHmac('sha256', ENCRYPTION_KEY).update(currentBlock.hash).digest('hex');
      if (currentBlock.signature !== expectedSignature) return false;
    }
    return true;
  }

  public getFullHistory(decrypt: boolean = false): any[] {
    if (!decrypt) return this.chain;

    return this.chain.map(block => ({
      index: block.index,
      timestamp: block.timestamp,
      hash: block.hash,
      previousHash: block.previousHash,
      signature: block.signature,
      data: this.decryptPayload(block.encryptedData)
    }));
  }
}

// Singleton instance
export const incidentLedger = new SecurityLedger();
