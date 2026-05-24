import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, 
  FileText, 
  BarChart3, 
  Headphones, 
  MessageSquare, 
  Users, 
  Bell, 
  ArrowRightLeft,
  ChevronDown
} from 'lucide-react';

export function LeaderPortalLayout({ children }) {
  return (
    <div className="page-content animate-in">
      {children}
    </div>
  );
}
