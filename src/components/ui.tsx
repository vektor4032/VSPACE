import { useEffect, useRef, useId } from "react";
import type { ReactNode, CSSProperties } from "react";
import { X } from "lucide-react";

export function IconButton({
  label,
  children,
  onClick,
  ...props
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-btn"
      title={label}
      aria-label={label}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">✳</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">YOUR SPACE, YOUR RULES</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <IconButton label="Закрыть" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}

export function Ring({
  value,
  size = 64,
  children,
}: {
  value: number;
  size?: number;
  children?: ReactNode;
}) {
  return (
    <div
      className="ring"
      style={
        {
          width: size,
          height: size,
          "--progress": `${Math.min(value, 100) * 3.6}deg`,
        } as CSSProperties
      }
    >
      <div>
        {children || (
          <span>
            {Math.round(value)}
            <small>%</small>
          </span>
        )}
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">
          <span className="tiny-star">✳</span> {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SectionHead({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <h2>
        <span>{index}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}
