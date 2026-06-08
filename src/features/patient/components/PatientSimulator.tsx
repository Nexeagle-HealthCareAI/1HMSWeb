import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MessageSquare, Palette, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// NOTE: In a real app, this should be an environment variable.
const API_KEY = "";

export const PatientSimulator: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isStyleLoading, setIsStyleLoading] = useState(false);
    const [userInput, setUserInput] = useState("");
    const [chatResponse, setChatResponse] = useState<{ label: string; text: string } | null>(null);

    // Refs for materials to update them dynamically
    const materialsRef = useRef<{
        skin: THREE.MeshLambertMaterial;
        shirt: THREE.MeshLambertMaterial;
        pants: THREE.MeshLambertMaterial;
        shoe: THREE.MeshLambertMaterial;
    } | null>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // --- 1. Three.js Scene Setup ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff); // Matches UI background

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 1.5, 4);
        camera.lookAt(0, 1.0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        mountRef.current.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(2, 5, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-2, 3, -5);
        scene.add(backLight);

        // Materials
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcd94 });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2b3d5c });
        const shoeMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

        materialsRef.current = { skin: skinMat, shirt: shirtMat, pants: pantsMat, shoe: shoeMat };

        const patientGroup = new THREE.Group();

        // Geometry Construction (adapted from provided code)
        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), skinMat);
        head.position.y = 1.75; head.castShadow = true; patientGroup.add(head);

        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15), skinMat);
        neck.position.y = 1.55; patientGroup.add(neck);

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), shirtMat);
        torso.position.y = 1.15; torso.castShadow = true; patientGroup.add(torso);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.7);
        const sleeveGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.25);

        const leftArm = new THREE.Mesh(armGeo, skinMat); leftArm.position.set(0.32, 1.1, 0); leftArm.rotation.z = -0.1; patientGroup.add(leftArm);
        const leftSleeve = new THREE.Mesh(sleeveGeo, shirtMat); leftSleeve.position.set(0.32, 1.35, 0); leftSleeve.rotation.z = -0.1; patientGroup.add(leftSleeve);

        const rightArm = new THREE.Mesh(armGeo, skinMat); rightArm.position.set(-0.32, 1.1, 0); rightArm.rotation.z = 0.1; patientGroup.add(rightArm);
        const rightSleeve = new THREE.Mesh(sleeveGeo, shirtMat); rightSleeve.position.set(-0.32, 1.35, 0); rightSleeve.rotation.z = 0.1; patientGroup.add(rightSleeve);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.85);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat); leftLeg.position.set(0.15, 0.4, 0); leftLeg.castShadow = true; patientGroup.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, pantsMat); rightLeg.position.set(-0.15, 0.4, 0); rightLeg.castShadow = true; patientGroup.add(rightLeg);

        // Shoes
        const shoeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.28);
        const leftShoe = new THREE.Mesh(shoeGeo, shoeMat); leftShoe.position.set(0.15, 0.05, 0.05); patientGroup.add(leftShoe);
        const rightShoe = new THREE.Mesh(shoeGeo, shoeMat); rightShoe.position.set(-0.15, 0.05, 0.05); patientGroup.add(rightShoe);

        scene.add(patientGroup);

        // Shadow
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.1, transparent: true }));
        shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; scene.add(shadow);

        setIsLoading(false);

        // Animation Loop
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            patientGroup.rotation.y += 0.005;
            renderer.render(scene, camera);
        };
        animate();

        // Resize Handler
        const handleResize = () => {
            if (!mountRef.current) return;
            const newWidth = mountRef.current.clientWidth;
            const newHeight = mountRef.current.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };

    }, []);


    // --- 2. Gemini API Integration ---

    const handleChat = async () => {
        if (!userInput.trim() || !API_KEY) {
            if (!API_KEY) setChatResponse({ label: "System", text: "API Key is missing. Please configuration it in PatientSimulator.tsx." });
            return;
        }

        setIsChatLoading(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a patient in a hospital waiting room. You are slightly anxious but polite. 
                            You have mild back pain. Answer the doctor's questions briefly.
                            User asks: "${userInput}"`
                        }]
                    }]
                })
            });

            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure, doctor.";
            setChatResponse({ label: "Patient says:", text: reply });

        } catch (error) {
            console.error(error);
            setChatResponse({ label: "Error", text: "Could not reach the patient." });
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleUpdateStyle = async () => {
        if (!userInput.trim() || !API_KEY) return;

        setIsStyleLoading(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Extract clothing colors from this text: "${userInput}". 
                            Return a valid JSON object with keys: "shirt", "pants", "skin", "shoes".
                            Value should be a hex color code (e.g. #FF0000). 
                            Only include keys mentioned or implied.
                            Example Output: { "shirt": "#0000FF", "pants": "#00FF00" }`
                        }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            });

            const data = await response.json();
            const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const colors = JSON.parse(jsonText);

            if (materialsRef.current) {
                if (colors.shirt) materialsRef.current.shirt.color.set(colors.shirt);
                if (colors.pants) materialsRef.current.pants.color.set(colors.pants);
                if (colors.skin) materialsRef.current.skin.color.set(colors.skin);
                if (colors.shoes) materialsRef.current.shoe.color.set(colors.shoes);
            }
            setChatResponse({ label: "System", text: "Style updated!" });

        } catch (error) {
            console.error(error);
            setChatResponse({ label: "Error", text: "Could not interpret style." });
        } finally {
            setIsStyleLoading(false);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* 3D Scene Container */}
            <div ref={mountRef} className="absolute inset-0 z-0 bg-transparent rounded-lg overflow-hidden" />

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                </div>
            )}

            {/* UI Overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-3">
                {/* Chat Bubble */}
                {chatResponse && (
                    <Card className="p-3 bg-white/90 backdrop-blur-md border-l-4 border-l-brand-500 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-xs font-bold text-brand-600 uppercase block mb-1">{chatResponse.label}</span>
                        <p className="text-sm text-gray-700">{chatResponse.text}</p>
                    </Card>
                )}

                {/* Controls - Removed as per user request */}
                {/* 
                <div className="flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20">
                    <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ask or describe style..."
                        className="bg-white/50 border-gray-200 focus:ring-brand-500 h-9"
                        onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="flex-1 bg-brand-600 hover:bg-brand-700 text-white gap-2"
                        onClick={handleChat}
                        disabled={isChatLoading || isStyleLoading}
                    >
                        {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                        Ask Patient
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2"
                        onClick={handleUpdateStyle}
                        disabled={isChatLoading || isStyleLoading}
                    >
                        {isStyleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                        Change Style
                    </Button>
                </div> 
                */}
            </div>
        </div>
    );
};
