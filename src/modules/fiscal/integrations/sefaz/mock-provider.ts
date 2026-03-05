'use client';

import type { SefazProvider, SefazConfig, SefazResponse } from './types';

// =====================================================
// MockSefazProvider
// Simulates SEFAZ responses for development/testing.
// Always authorizes successfully (no random rejections).
// =====================================================

function generateProtocol(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${timestamp}${random}`;
}

function generateChaveAcesso(): string {
  const digits: string[] = [];
  for (let i = 0; i < 44; i++) {
    digits.push(Math.floor(Math.random() * 10).toString());
  }
  return digits.join('');
}

async function simulateDelay(): Promise<void> {
  const ms = 800 + Math.random() * 1200;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockSefazProvider implements SefazProvider {
  readonly name = 'MockSefazProvider';

  async authorize(
    documentId: string,
    config: SefazConfig
  ): Promise<SefazResponse> {
    await simulateDelay();

    console.info(
      `[MockSefaz] authorize | doc=${documentId} env=${config.environment} uf=${config.uf}`
    );

    return {
      success: true,
      cstat: '100',
      xmotivo: 'Autorizado o uso da NF-e',
      protocol: generateProtocol(),
      chaveAcesso: generateChaveAcesso(),
      timestamp: new Date().toISOString(),
    };
  }

  async cancel(
    documentId: string,
    justification: string,
    config: SefazConfig
  ): Promise<SefazResponse> {
    await simulateDelay();

    console.info(
      `[MockSefaz] cancel | doc=${documentId} reason="${justification.slice(0, 50)}..."`
    );

    return {
      success: true,
      cstat: '135',
      xmotivo: 'Evento registrado e vinculado a NF-e',
      protocol: generateProtocol(),
      timestamp: new Date().toISOString(),
    };
  }

  async correctLetter(
    documentId: string,
    correction: string,
    sequenceNumber: number,
    config: SefazConfig
  ): Promise<SefazResponse> {
    await simulateDelay();

    console.info(
      `[MockSefaz] CC-e | doc=${documentId} seq=${sequenceNumber}`
    );

    return {
      success: true,
      cstat: '135',
      xmotivo: 'Evento registrado e vinculado a NF-e',
      protocol: generateProtocol(),
      timestamp: new Date().toISOString(),
    };
  }

  async inutilize(
    serie: number,
    startNumber: number,
    endNumber: number,
    justification: string,
    config: SefazConfig
  ): Promise<SefazResponse> {
    await simulateDelay();

    console.info(
      `[MockSefaz] inutilize | serie=${serie} range=${startNumber}-${endNumber}`
    );

    return {
      success: true,
      cstat: '102',
      xmotivo: 'Inutilização de número homologado',
      protocol: generateProtocol(),
      timestamp: new Date().toISOString(),
    };
  }

  async queryStatus(
    chaveAcesso: string,
    config: SefazConfig
  ): Promise<SefazResponse> {
    await simulateDelay();

    console.info(
      `[MockSefaz] queryStatus | chave=${chaveAcesso.slice(0, 10)}...`
    );

    return {
      success: true,
      cstat: '100',
      xmotivo: 'Autorizado o uso da NF-e',
      protocol: generateProtocol(),
      chaveAcesso,
      timestamp: new Date().toISOString(),
    };
  }
}
