import Sidebar from './components/admin/Sidebar';
import RouteManagementPage from './pages/admin/RouteManagementPage';

function App() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <RouteManagementPage />
    </div>
  );
}

export default App;