'use client';

import { useTxModal } from '@/store/tx-modal-store';
import { BorrowConfirmModal }  from './borrow-confirm-modal';
import { RepayConfirmModal }   from './repay-confirm-modal';
import { DepositConfirmModal } from './deposit-confirm-modal';
import { WithdrawConfirmModal} from './withdraw-confirm-modal';
import { TxPendingModal }      from './tx-pending-modal';
import { TxSuccessModal }      from './tx-success-modal';
import { TxFailedModal }       from './tx-failed-modal';

export function TxModalProvider() {
  const { modal, close } = useTxModal();
  if (!modal) return null;

  switch (modal.type) {
    case 'borrow-confirm':  return <BorrowConfirmModal  payload={modal} onClose={close} />;
    case 'repay-confirm':   return <RepayConfirmModal   payload={modal} onClose={close} />;
    case 'deposit-confirm': return <DepositConfirmModal payload={modal} onClose={close} />;
    case 'withdraw-confirm':return <WithdrawConfirmModal payload={modal} onClose={close} />;
    case 'tx-pending':      return <TxPendingModal      payload={modal} />;
    case 'tx-success':      return <TxSuccessModal      payload={modal} onClose={close} />;
    case 'tx-failed':       return <TxFailedModal       payload={modal} onClose={close} />;
    default:                return null;
  }
}
