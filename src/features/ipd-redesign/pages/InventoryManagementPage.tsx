import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InventoryBoardScreen } from '../screens/InventoryBoardScreen';

/**
 * Top-level route wrapper for the Inventory Management board (main side nav → /inventory),
 * not gated behind the IPD workspace — stock/procurement/compliance are hospital-wide, not
 * IPD-only, even though the board itself still reads store/batch data shared with IPD/OT/CSSD.
 */
const InventoryManagementPage: React.FC = () => {
    const navigate = useNavigate();
    return <InventoryBoardScreen onBack={() => navigate(-1)} />;
};

export default InventoryManagementPage;
