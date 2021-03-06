import { Wallet } from '@ethersproject/wallet';
import analytics from '@segment/analytics-react-native';
import { captureException } from '@sentry/react-native';
import { ChainId, Trade } from '@uniswap/sdk';
import { join, map } from 'lodash';
import {
  depositCompound,
  depositUniswap,
  swap,
  unlock,
  withdrawCompound,
} from './actions';
import {
  createSwapAndDepositCompoundRap,
  estimateSwapAndDepositCompound,
} from './swapAndDepositCompound';
import { createUnlockAndSwapRap, estimateUnlockAndSwap } from './unlockAndSwap';
import {
  createWithdrawFromCompoundRap,
  estimateWithdrawFromCompound,
} from './withdrawFromCompound';
import { Asset, ExchangeModalType } from '@rainbow-me/entities';

import logger from 'logger';

export enum RapActionType {
  depositCompound = 'depositCompound',
  depositUniswap = 'depositUniswap',
  swap = 'swap',
  unlock = 'unlock',
  withdrawCompound = 'withdrawCompound',
  withdrawUniswap = 'withdrawUniswap',
}

export interface RapActionParameters {
  amount?: string | null;
  assetToUnlock?: Asset;
  chainId?: ChainId;
  contractAddress?: string;
  inputAmount?: string | null;
  outputAmount?: string | null;
  tradeDetails?: Trade;
}

export interface UnlockActionParameters {
  amount: string;
  assetToUnlock: Asset;
  contractAddress: string;
}

export interface SwapActionParameters {
  inputAmount: string;
  outputAmount: string;
  tradeDetails: Trade;
}

export interface RapActionTransaction {
  hash: string | null;
}

export interface RapAction {
  parameters: RapActionParameters;
  transaction: RapActionTransaction;
  type: RapActionType;
}

export interface Rap {
  actions: RapAction[];
}

const NOOP = () => null;

export const RapActionTypes = {
  depositCompound: 'depositCompound' as RapActionType,
  depositUniswap: 'depositUniswap' as RapActionType,
  swap: 'swap' as RapActionType,
  unlock: 'unlock' as RapActionType,
  withdrawCompound: 'withdrawCompound' as RapActionType,
  withdrawUniswap: 'withdrawUniswap' as RapActionType,
};

const createRapByType = (
  type: string,
  swapParameters: SwapActionParameters
) => {
  switch (type) {
    case ExchangeModalType.depositCompound:
      return createSwapAndDepositCompoundRap(swapParameters);
    case ExchangeModalType.withdrawCompound:
      return createWithdrawFromCompoundRap(swapParameters);
    default:
      return createUnlockAndSwapRap(swapParameters);
  }
};

export const getRapEstimationByType = (
  type: string,
  swapParameters: SwapActionParameters
) => {
  switch (type) {
    case ExchangeModalType.depositCompound:
      return estimateSwapAndDepositCompound(swapParameters);
    case ExchangeModalType.swap:
      return estimateUnlockAndSwap(swapParameters);
    case ExchangeModalType.withdrawCompound:
      return estimateWithdrawFromCompound();
    default:
      return null;
  }
};

const findActionByType = (type: RapActionType) => {
  switch (type) {
    case RapActionTypes.unlock:
      return unlock;
    case RapActionTypes.swap:
      return swap;
    case RapActionTypes.depositCompound:
      return depositCompound;
    case RapActionTypes.depositUniswap:
      return depositUniswap;
    case RapActionTypes.withdrawCompound:
      return withdrawCompound;
    default:
      return NOOP;
  }
};

const getRapFullName = (actions: RapAction[]) => {
  const actionTypes = map(actions, 'type');
  return join(actionTypes, ' + ');
};

const executeAction = async (
  action: RapAction,
  wallet: Wallet,
  rap: Rap,
  index: number,
  rapName: string,
  baseNonce?: number
) => {
  logger.log('[1 INNER] index', index);
  const { parameters, type } = action;
  const actionPromise = findActionByType(type);
  logger.log('[2 INNER] executing type', type);
  try {
    const nonce = await actionPromise(
      wallet,
      rap,
      index,
      parameters,
      baseNonce
    );
    return nonce;
  } catch (error) {
    logger.sentry('[3 INNER] error running action');
    captureException(error);
    analytics.track('Rap failed', {
      category: 'raps',
      failed_action: type,
      label: rapName,
    });
    return null;
  }
};

export const executeRap = async (
  wallet: Wallet,
  type: string,
  swapParameters: SwapActionParameters,
  callback: () => void
) => {
  const rap: Rap = await createRapByType(type, swapParameters);
  const { actions } = rap;
  const rapName = getRapFullName(actions);

  analytics.track('Rap started', {
    category: 'raps',
    label: rapName,
  });

  logger.log('[common - executing rap]: actions', actions);
  let baseNonce = null;
  if (actions.length) {
    const firstAction = actions[0];
    baseNonce = await executeAction(firstAction, wallet, rap, 0, rapName);
    if (baseNonce) {
      for (let index = 1; index < actions.length; index++) {
        const action = actions[index];
        await executeAction(action, wallet, rap, index, rapName, baseNonce);
      }
      callback();
    }
  }

  analytics.track('Rap completed', {
    category: 'raps',
    label: rapName,
  });
  logger.log('[common - executing rap] finished execute rap function');
};

export const createNewRap = (actions: RapAction[]) => {
  return {
    actions,
  };
};

export const createNewAction = (
  type: RapActionType,
  parameters: RapActionParameters
) => {
  const newAction = {
    parameters,
    transaction: { confirmed: null, hash: null },
    type,
  };

  logger.log('[common] Creating a new action', newAction);
  return newAction;
};
