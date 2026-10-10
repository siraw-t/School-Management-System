import Icon from './Icon';
import { T } from '../theme';
import { useHover } from '../hooks';

export default function EditBtn({ onClick }) {
  const { hovered, bind } = useHover();
  return (
    <button
      onClick={onClick}
      {...bind}
      style={{
        display: 'grid', placeItems: 'center',
        width: 38, height: 38, borderRadius: 11,
        background: hovered ? T.surfaceHover : T.surface,
        border: `1px solid ${hovered ? 'rgba(124,92,255,0.45)' : T.border}`,
        color: hovered ? '#c4b5fd' : T.muted,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
      aria-label="Edit"
    >
      <Icon name="edit" size={16} />
    </button>
  );
}