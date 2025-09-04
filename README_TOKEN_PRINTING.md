# Token Printing System

A lightweight, dependency-free token printing solution for thermal printer receipts in React applications.

## Features

- **Thermal Printer Optimized**: CSS optimized for 58mm and 80mm thermal printers (203 DPI)
- **Lightweight**: No heavy print libraries, uses iframe-based printing
- **QR Code Support**: Optional QR code generation (requires `qrcode` package)
- **Configurable**: Customizable hospital name, counter, department, and print options
- **TypeScript**: Fully typed components and utilities

## Installation

### Required Dependencies
```bash
npm install date-fns lucide-react
```

### Optional Dependencies
```bash
npm install qrcode
```
*Note: QR code functionality will be skipped gracefully if the package is not installed*

## Usage

### Basic Token Printing

```tsx
import { TokenSlip } from './components/TokenSlip';

const appointment = {
  appointmentId: 'APT001',
  patientFullName: 'John Doe',
  patientId: 'PAT001',
  doctorName: 'Dr. Smith',
  token: { tokenNumber: 5 },
  startAt: '2024-01-15T09:00:00Z',
  endAt: '2024-01-15T09:30:00Z'
};

function App() {
  return (
    <TokenSlip
      appointment={appointment}
      hospitalName="NEXEAGLE HOSPITAL"
      counterName="COUNTER 1"
      departmentName="GENERAL"
      widthMm={58}
      showQR={true}
      showVisitId={true}
    />
  );
}
```

### Modal with Configuration

```tsx
import { TokenPrintModal } from './components/TokenPrintModal';

function AppointmentDashboard() {
  const [showTokenPrint, setShowTokenPrint] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const handlePrintToken = (appointment) => {
    setSelectedAppointment(appointment);
    setShowTokenPrint(true);
  };

  return (
    <div>
      {/* Your appointment table */}
      <button onClick={() => handlePrintToken(appointment)}>
        Print Token
      </button>

      {/* Token Print Modal */}
      {showTokenPrint && selectedAppointment && (
        <TokenPrintModal
          appointment={selectedAppointment}
          isOpen={showTokenPrint}
          onClose={() => setShowTokenPrint(false)}
        />
      )}
    </div>
  );
}
```

## Components

### TokenSlip

Renders a token slip with print functionality.

**Props:**
- `appointment`: Appointment data object
- `hospitalName`: Hospital name (default: 'HOSPITAL NAME')
- `counterName`: Counter name (default: 'COUNTER 1')
- `departmentName`: Department name (default: 'GENERAL')
- `widthMm`: Paper width in mm (58 or 80, default: 58)
- `showQR`: Show QR code (default: false)
- `showVisitId`: Show visit ID (default: false)

### TokenPrintModal

Modal component with configuration options for token printing.

**Props:**
- `appointment`: Appointment data object
- `isOpen`: Modal open state
- `onClose`: Close handler function

## Utilities

### printElement(element, cssText)

Prints a DOM element using an invisible iframe.

**Parameters:**
- `element`: HTMLElement to print
- `cssText`: CSS string for styling

### receiptCss(widthMm)

Returns CSS optimized for thermal printer receipts.

**Parameters:**
- `widthMm`: Paper width in millimeters (default: 58)

**Returns:** CSS string with thermal printer optimizations

## CSS Features

- **Page Size**: Automatic sizing for 58mm/80mm paper
- **Zero Margins**: Optimized for thermal printers
- **Monospace Font**: Courier New for consistent printing
- **Dashed Dividers**: Visual separation between sections
- **Print Media**: Optimized for print output

## Thermal Printer Compatibility

- **58mm Printers**: Standard thermal receipt printers
- **80mm Printers**: Wide format thermal printers
- **DPI**: Optimized for 203 DPI (standard thermal printer resolution)
- **Paper**: Continuous roll thermal paper

## Browser Support

- Modern browsers with iframe support
- Print dialog integration
- CSS Grid and Flexbox support required

## Troubleshooting

### Print Not Working
- Ensure popup blockers are disabled
- Check browser print settings
- Verify iframe creation is successful

### QR Code Not Showing
- Install `qrcode` package: `npm install qrcode`
- Check console for import errors
- QR code will be skipped gracefully if unavailable

### Styling Issues
- Verify CSS is being applied to iframe
- Check for CSS conflicts
- Ensure print media queries are supported

## Example Output

```
┌─────────────────────────────────────┐
│         NEXEAGLE HOSPITAL           │
│                                     │
│ COUNTER 1 • GENERAL                 │
│                                     │
│            TOKEN #5                 │
│                                     │
│ Department                          │
│ GENERAL                             │
│                                     │
│ Doctor                              │
│ Dr. Smith                           │
│                                     │
│ Patient                             │
│ John Doe                            │
│                                     │
│ Patient ID                          │
│ PAT001                              │
│                                     │
│ Appointment Time                    │
│ 09:00 - 09:30                      │
│                                     │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                     │
│ [QR Code]                           │
│                                     │
│ Visit ID: APT001                    │
│                                     │
│ Issued at: 15/01/2024 14:30:00 IST │
└─────────────────────────────────────┘
```

## License

This project is part of the EasyHMS application.
