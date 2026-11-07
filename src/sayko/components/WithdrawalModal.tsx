// @ts-nocheck
import React from 'react';
import { WalletModal } from './WalletModal';
import { UserProfile } from '../lib/store';

export interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onRequireAuth: () => void;
  onNavigateToAccount?: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRequireAuth,
  onNavigateToAccount,
}) => {
  return (
    <WalletModal
      isOpen={isOpen}
      onClose={onClose}
      type="withdraw"
      currentUser={currentUser}
      onRequireAuth={onRequireAuth}
      onNavigateToAccount={onNavigateToAccount}
    />
  );
};

export default WithdrawalModal;
