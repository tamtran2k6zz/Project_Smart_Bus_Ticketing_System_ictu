import Sidebar from './components/admin/Sidebar';
import RouteManagementPage from './pages/admin/RouteManagementPage';
import SeatSelectionDemoPage from './pages/booking/SeatSelectionDemoPage';

function App() {
  const isSeatMapDemo = window.location.hash === '#seat-map';

  if (isSeatMapDemo) {
    return <SeatSelectionDemoPage />;
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <RouteManagementPage />
    </div>
  );
}

export default App;