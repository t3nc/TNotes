import type { ReactNode } from 'react';
import { Button } from './button';
import { Modal } from './modal';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-[14px] leading-relaxed text-muted">{description}</div>
    </Modal>
  );
}
