import { Request, Response } from 'express';
import crypto from 'crypto';
import { envConfig } from '../config/env';
import { setuService } from '../services/setuService';
import { logger } from '../utils/logger';

const processedWebhookEvents = new Set<string>();

export class WebhookController {
  private verifySignature(req: Request): boolean {
    if (!envConfig.setu.webhookSecret) return true;

    const signature = req.headers['x-setu-signature'] as string;
    if (!signature) return false;

    try {
      const hmac = crypto.createHmac('sha256', envConfig.setu.webhookSecret);
      const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch {
      return false;
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    if (!this.verifySignature(req)) {
      logger.warn('WebhookController: Received webhook with invalid signature');
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    const { type, consentId, status, id } = req.body;
    const eventKey = `${type}-${consentId || id}-${status}`;

    // Idempotent deduplication check
    if (processedWebhookEvents.has(eventKey)) {
      logger.info(`WebhookController: Duplicate webhook event skipped: ${eventKey}`);
      res.status(200).json({ success: true, deduplicated: true });
      return;
    }

    logger.info(`WebhookController: Processing event type=${type}, consentId=${consentId || id}, status=${status}`);

    if (type === 'CONSENT_STATUS_UPDATE' && (consentId || id) && status) {
      setuService.updateConsentStatus(consentId || id, status);
    }

    processedWebhookEvents.add(eventKey);
    res.status(200).json({ success: true });
  }
}

export const webhookController = new WebhookController();
