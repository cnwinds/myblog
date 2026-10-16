import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { visitService } from '../services/visit';
import SiteLayout from '../components/Layout/SiteLayout';
import BlogHome from '../components/Home/BlogHome';
import LabList from '../components/Article/LabList';

const LAB_PATH = '/lab';

export default function HomePage() {
  const location = useLocation();
  const isLab = location.pathname === LAB_PATH;

  useEffect(() => {
    visitService.recordVisit(null);
  }, []);

  return (
    <SiteLayout section={isLab ? 'lab' : 'blog'}>
      {isLab ? <LabList /> : <BlogHome />}
    </SiteLayout>
  );
}
