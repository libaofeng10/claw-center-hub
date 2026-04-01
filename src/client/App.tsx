import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import AgentList from './pages/AgentList';
import AgentDetail from './pages/AgentDetail';
import Channels from './pages/Channels';
import Logs from './pages/Logs';
import Config from './pages/Config';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/agents" element={<AgentList />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/config" element={<Config />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
