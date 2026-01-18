import { CornerUpRight, CornerUpLeft, ArrowUp } from 'lucide-react';

const InstructionIcon = ({ type }) => {
  if (type && type.includes('right')) return <CornerUpRight size={48} className="text-white" />;
  if (type && type.includes('left')) return <CornerUpLeft size={48} className="text-white" />;
  return <ArrowUp size={48} className="text-white" />;
};

export default InstructionIcon;

