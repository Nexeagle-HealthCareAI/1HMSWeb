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
                margin: 0; 
                padding: 0; 
                background: #f8fafc; 
                color: #0f172a; 
                height: 100vh;
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

            .brand-container {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
            }

            .brand-logo {
                width: 50px;
                height: 50px;
                background: white;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #0f172a;
                font-weight: 900;
                font-size: 28px;
            }

            .brand {
                font-size: 32pt;
                font-weight: 900;
                letter-spacing: -0.5px;
                margin: 0;
                background: linear-gradient(to right, #ffffff, #cbd5e1);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .brand-sub {
                font-size: 16pt;
                color: #94a3b8;
                margin-top: 10px;
                font-weight: 300;
                letter-spacing: 2px;
                text-transform: uppercase;
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

            .dr-title {
                font-size: 14pt;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 600;
                margin-bottom: 10px;
            }

            .dr-name {
                font-size: 42pt;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                line-height: 1.1;
                letter-spacing: -1px;
            }

            .dr-spec {
                font-size: 20pt;
                font-weight: 600;
                color: #14b8a6;
                margin-top: 15px;
                padding: 8px 24px;
                background: rgba(20, 184, 166, 0.1);
                border-radius: 100px;
                display: inline-block;
            }

            .dr-qual {
                font-size: 16pt;
                color: #64748b;
                margin-top: 15px;
                font-weight: 400;
            }

            .qr-wrapper {
                position: relative;
                margin: 60px 0;
            }

            .qr-container {
                padding: 24px;
                background: white;
                border-radius: 32px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
                position: relative;
                z-index: 2;
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
                justify-content: space-between;
                border-top: 1px solid #e2e8f0;
            }
            
            .hospital-info {
                text-align: left;
            }

            .hospital-sub {
                font-size: 11pt;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .hospital-name {
                font-size: 18pt;
                font-weight: 700;
                color: #0f172a;
            }

            .nexeagle-tag {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12pt;
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
                <div class="brand-container">
                    <div class="brand-logo">N</div>
                    <h1 class="brand">NexEagle</h1>
                </div>
                <div class="brand-sub">Doctor Dekho Platform</div>
            </div>

            <div class="main-content">
                <div class="dr-title">Consultation With</div>
                <h2 class="dr-name">${doctor.fullName || 'Doctor'}</h2>
                
                ${doctor.departmentName ? `<div class="dr-spec">${doctor.departmentName}</div>` : ''}
                ${doctor.qualification ? `<div class="dr-qual">${doctor.qualification}</div>` : ''}

                <div class="qr-wrapper">
                    <div class="qr-accent"></div>
                    <div class="qr-container">
                        <img class="qr-img" src="${qrUrl}" alt="QR Code to book appointment" />
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
                <div class="hospital-info">
                    <div class="hospital-sub">Practicing At</div>
                    <div class="hospital-name">${hospitalName}</div>
                </div>
                <div class="nexeagle-tag">
                    Powered by <span>NexEagle</span>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};
