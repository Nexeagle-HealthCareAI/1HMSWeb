import { PublicDirectoryDoctorTile } from '../features/hospital/services/publicDirectoryDoctorsApi';

export const buildDoctorQrPosterA4 = (doctor: PublicDirectoryDoctorTile, hospitalName: string, city: string): string => {
    // Generate the public URL that patients should visit
    const doctorSlug = `${(doctor.fullName || 'doctor').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${doctor.doctorId}`;
    const publicUrl = `https://nexeagle.com/doctors/${doctorSlug}`;
    
    // Generate QR code URL using a public API (qrserver)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicUrl)}&margin=10`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Scan to Book - ${doctor.fullName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap" rel="stylesheet">
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { 
                font-family: 'Outfit', 'Segoe UI', sans-serif; 
                margin: 0 auto; 
                padding: 0; 
                background: #f8fafc; 
                color: #0f172a; 
                width: 210mm;
                height: 297mm;
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
            }
            /* Premium Background Elements */
            .bg-blob-1 {
                position: absolute;
                top: -100px;
                right: -100px;
                width: 400px;
                height: 400px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(20,184,166,0.15) 0%, rgba(20,184,166,0) 70%);
                z-index: 0;
            }
            .bg-blob-2 {
                position: absolute;
                bottom: -150px;
                left: -100px;
                width: 600px;
                height: 600px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(14,165,233,0.1) 0%, rgba(14,165,233,0) 70%);
                z-index: 0;
            }
            
            .content-wrapper {
                position: relative;
                z-index: 10;
                display: flex;
                flex-direction: column;
                height: 100%;
                border: 12px solid white;
            }

            .header {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                padding: 40px 50px;
                text-align: center;
                color: white;
                position: relative;
                overflow: hidden;
            }
            
            .header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #14b8a6, #0ea5e9);
            }

            .hospital-name-header {
                font-size: 18pt;
                color: #94a3b8;
                margin-bottom: 5px;
                font-weight: 500;
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            .dr-name-header {
                font-size: 38pt;
                font-weight: 900;
                letter-spacing: -0.5px;
                margin: 0;
                background: linear-gradient(to right, #ffffff, #cbd5e1);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                line-height: 1.1;
            }

            .dr-spec-header {
                font-size: 16pt;
                color: #14b8a6;
                margin-top: 10px;
                font-weight: 500;
            }

            .main-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 60px;
                text-align: center;
            }

            .qr-wrapper {
                position: relative;
                margin: 20px 0 40px 0;
            }

            .qr-container {
                padding: 24px;
                background: white;
                border-radius: 32px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
                position: relative;
                z-index: 2;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .qr-accent {
                position: absolute;
                inset: -4px;
                border-radius: 36px;
                background: linear-gradient(135deg, #14b8a6, #0ea5e9);
                z-index: 1;
                opacity: 0.5;
                filter: blur(8px);
            }

            .qr-img {
                width: 400px;
                height: 400px;
                display: block;
                border-radius: 16px;
            }

            .qr-logo-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 8px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .brand-logo-small {
                width: 50px;
                height: 50px;
                object-fit: contain;
                border-radius: 4px;
            }

            .cta-box {
                background: white;
                padding: 25px 50px;
                border-radius: 24px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                border: 1px solid #f1f5f9;
            }

            .cta-text {
                font-size: 24pt;
                font-weight: 800;
                color: #0f172a;
                margin-bottom: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }

            .cta-sub {
                font-size: 15pt;
                color: #64748b;
                font-weight: 400;
            }

            .footer {
                padding: 35px 50px;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                border-top: 1px solid #e2e8f0;
            }

            .nexeagle-tag {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14pt;
                color: #64748b;
                font-weight: 500;
            }
            
            .nexeagle-tag span {
                color: #14b8a6;
                font-weight: 700;
            }
        </style>
    </head>
    <body>
        <div class="bg-blob-1"></div>
        <div class="bg-blob-2"></div>
        
        <div class="content-wrapper">
            <div class="header">
                <div class="hospital-name-header">${hospitalName}</div>
                <h1 class="dr-name-header">${doctor.fullName || 'Doctor'}</h1>
                ${doctor.departmentName ? `<div class="dr-spec-header">${doctor.departmentName}</div>` : ''}
                ${doctor.qualification ? `<div class="dr-spec-header" style="font-size:12pt; color:#94a3b8; margin-top:4px;">${doctor.qualification}</div>` : ''}
            </div>

            <div class="main-content">
                <div class="qr-wrapper">
                    <div class="qr-accent"></div>
                    <div class="qr-container">
                        <img class="qr-img" src="${qrUrl}" alt="QR Code to book appointment" />
                        <div class="qr-logo-overlay">
                            <img class="brand-logo-small" src="${window.location.origin}/Logo.png" alt="NexEagle Logo" />
                        </div>
                    </div>
                </div>

                <div class="cta-box">
                    <div class="cta-text">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12h4l3-9 5 18 3-9h5"/>
                        </svg>
                        Scan to Book
                    </div>
                    <div class="cta-sub">Point your phone camera here to view profile and book instantly</div>
                </div>
            </div>

            <div class="footer">
                <div class="nexeagle-tag">
                    Powered by <span>NexEagle</span>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};
