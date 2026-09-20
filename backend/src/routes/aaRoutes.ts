import { Router } from 'express';
import { aaController } from '../controllers/aaController';
import { webhookController } from '../controllers/webhookController';

export const aaRouter = Router();

aaRouter.post('/consents', (req, res) => aaController.createConsent(req, res));
aaRouter.get('/consents/:id/status', (req, res) => aaController.getConsentStatus(req, res));
aaRouter.post('/consents/:id/revoke', (req, res) => aaController.revokeConsent(req, res));
aaRouter.post('/sync/trigger', (req, res) => aaController.triggerSync(req, res));
aaRouter.post('/webhook', (req, res) => webhookController.handleWebhook(req, res));
