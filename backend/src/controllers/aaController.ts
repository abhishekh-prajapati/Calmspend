import { Request, Response } from 'express';
import { setuService } from '../services/setuService';
import type { ApiResponse } from '../types/aa.types';

export class AaController {
  async createConsent(req: Request, res: Response): Promise<void> {
    try {
      const { mobileNumber, customerVpa, redirectUrl } = req.body;

      if (!mobileNumber || typeof mobileNumber !== 'string') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Valid mobileNumber is required',
        };
        res.status(400).json(response);
        return;
      }

      const result = await setuService.createConsent({
        mobileNumber,
        customerVpa,
        redirectUrl,
      });

      res.status(201).json({
        data: result,
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Consent creation failed';
      res.status(502).json({
        data: null,
        error: message,
      });
    }
  }

  async getConsentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await setuService.getConsentStatus(id);

      res.status(200).json({
        data: result,
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch consent status';
      res.status(404).json({
        data: null,
        error: message,
      });
    }
  }

  async revokeConsent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await setuService.revokeConsent(id);

      res.status(200).json({
        data: { success },
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke consent';
      res.status(500).json({
        data: null,
        error: message,
      });
    }
  }

  async triggerSync(req: Request, res: Response): Promise<void> {
    try {
      const { consentId } = req.body;

      if (!consentId || typeof consentId !== 'string') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Valid consentId is required to trigger synchronization',
        };
        res.status(400).json(response);
        return;
      }

      // Verify consent status
      const consent = await setuService.getConsentStatus(consentId);
      if (!consent) {
        const response: ApiResponse<null> = {
          data: null,
          error: `Consent with ID ${consentId} not found`,
        };
        res.status(404).json(response);
        return;
      }

      // Fetch normalized statements
      const accounts = await setuService.fetchStatements(consentId);

      res.status(200).json({
        data: {
          consentId,
          accounts,
        },
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to trigger account sync';
      res.status(502).json({
        data: null,
        error: message,
      });
    }
  }
}


export const aaController = new AaController();
