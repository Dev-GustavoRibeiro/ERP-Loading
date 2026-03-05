// =====================================================
// SEFAZ Provider — Type Definitions
// Provider Pattern for NF-e/NFC-e SEFAZ integration
// =====================================================

export type SefazEnvironment = 'homologacao' | 'producao';

export interface SefazConfig {
  empresaId: string;
  environment: SefazEnvironment;
  uf: string;
  certificateId?: string;
}

export interface SefazRequest {
  documentId: string;
  empresaId: string;
  operation: SefazOperation;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface SefazResponse {
  success: boolean;
  cstat: string;
  xmotivo: string;
  protocol?: string;
  chaveAcesso?: string;
  xmlResponse?: string;
  timestamp: string;
}

export type SefazOperation =
  | 'authorize'
  | 'cancel'
  | 'correct_letter'
  | 'inutilize'
  | 'query_status';

export interface SefazProvider {
  readonly name: string;

  /** Authorize (emit) an NF-e/NFC-e document */
  authorize(
    documentId: string,
    config: SefazConfig
  ): Promise<SefazResponse>;

  /** Cancel an authorized document */
  cancel(
    documentId: string,
    justification: string,
    config: SefazConfig
  ): Promise<SefazResponse>;

  /** Send a Carta de Correção (CC-e) */
  correctLetter(
    documentId: string,
    correction: string,
    sequenceNumber: number,
    config: SefazConfig
  ): Promise<SefazResponse>;

  /** Inutilize a range of document numbers */
  inutilize(
    serie: number,
    startNumber: number,
    endNumber: number,
    justification: string,
    config: SefazConfig
  ): Promise<SefazResponse>;

  /** Query document status at SEFAZ */
  queryStatus(
    chaveAcesso: string,
    config: SefazConfig
  ): Promise<SefazResponse>;
}

/** Returned when RealProvider can't operate due to missing configuration */
export class SefazNotConfiguredError extends Error {
  constructor(reason: string) {
    super(`SEFAZ_NOT_CONFIGURED: ${reason}`);
    this.name = 'SefazNotConfiguredError';
  }
}
