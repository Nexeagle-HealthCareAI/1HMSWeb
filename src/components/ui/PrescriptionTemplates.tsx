import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { Search, Star, X, Plus ,  Heart, Clock, Zap, Crown, Sparkles, Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Template Categories
const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', count: 12 },
  { id: 'modern', name: 'Modern', count: 4 },
  { id: 'classic', name: 'Classic', count: 3 },
  { id: 'minimal', name: 'Minimal', count: 3 },
  { id: 'colorful', name: 'Colorful', count: 2 }
];

// Predefined Template Data with Unique Layouts
const PRESCRIPTION_TEMPLATES = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    category: 'modern',
    tags: ['clean', 'professional', 'blue'],
    popularity: 'trending',
    premium: false,
    elements: [
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 40,
        width: 400,
        height: 60,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Inter', fontSize: 24, color: '#2563eb', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 90,
        width: 300,
        height: 30,
        content: '{{Doctor.Qualification}} • {{Doctor.Specialty}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#64748b' }
      },
      {
        id: nanoid(),
        type: 'line',
        x: 50,
        y: 140,
        width: 694,
        height: 2,
        style: { strokeColor: '#e2e8f0', strokeWidth: 1 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 180,
        width: 200,
        height: 40,
        content: 'PRESCRIPTION',
        style: { fontFamily: 'Inter', fontSize: 18, color: '#1e293b', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 550,
        y: 180,
        width: 150,
        height: 25,
        content: 'Date: {{Date}}',
        style: { fontFamily: 'Inter', fontSize: 12, color: '#64748b' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 250,
        width: 100,
        height: 25,
        content: 'Patient:',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#374151', fontWeight: '600' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 150,
        y: 250,
        width: 300,
        height: 25,
        content: '{{Patient.Name}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#6b7280' }
      }
    ]
  },
  {
    id: 'classic-formal',
    name: 'Classic Formal',
    category: 'classic',
    tags: ['formal', 'traditional', 'gray'],
    popularity: 'popular',
    premium: false,
    elements: [
      // Ornate header box
      {
        id: nanoid(),
        type: 'rectangle',
        x: 40,
        y: 30,
        width: 714,
        height: 120,
        style: { fillColor: '#f8fafc', strokeColor: '#cbd5e1', strokeWidth: 2, borderRadius: 0 }
      },
      // Inner border
      {
        id: nanoid(),
        type: 'rectangle',
        x: 50,
        y: 40,
        width: 694,
        height: 100,
        style: { fillColor: 'transparent', strokeColor: '#94a3b8', strokeWidth: 1, borderRadius: 0 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 70,
        y: 60,
        width: 400,
        height: 30,
        content: 'DR. {{Doctor.FullName}}',
        style: { fontFamily: 'Times New Roman', fontSize: 22, color: '#1e293b', fontWeight: 'bold', textAlign: 'center' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 70,
        y: 90,
        width: 654,
        height: 25,
        content: '{{Doctor.Qualification}} - {{Doctor.Specialty}}',
        style: { fontFamily: 'Times New Roman', fontSize: 14, color: '#475569', textAlign: 'center' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 70,
        y: 110,
        width: 654,
        height: 25,
        content: '{{Doctor.Address}} • Registration No: {{Doctor.RegNo}} • Phone: {{Doctor.Phone}}',
        style: { fontFamily: 'Times New Roman', fontSize: 11, color: '#64748b', textAlign: 'center' }
      },
      // Decorative lines
      {
        id: nanoid(),
        type: 'line',
        x: 40,
        y: 170,
        width: 150,
        height: 2,
        style: { strokeColor: '#94a3b8', strokeWidth: 2 }
      },
      {
        id: nanoid(),
        type: 'line',
        x: 604,
        y: 170,
        width: 150,
        height: 2,
        style: { strokeColor: '#94a3b8', strokeWidth: 2 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 300,
        y: 160,
        width: 194,
        height: 30,
        content: 'MEDICAL PRESCRIPTION',
        style: { fontFamily: 'Times New Roman', fontSize: 16, color: '#374151', fontWeight: 'bold', textAlign: 'center' }
      }
    ]
  },
  {
    id: 'medical-professional',
    name: 'Medical Professional',
    category: 'modern',
    tags: ['dark', 'professional', 'premium'],
    popularity: 'trending',
    premium: true,
    elements: [
      // Dark header with gradient
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 794,
        height: 140,
        style: { fillColor: '#0f172a', strokeColor: 'transparent', strokeWidth: 0 }
      },
      // Accent gradient strip
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 140,
        width: 794,
        height: 6,
        style: { fillColor: '#3b82f6', strokeColor: 'transparent' }
      },
      // Medical symbol background
      {
        id: nanoid(),
        type: 'circle',
        x: 650,
        y: 20,
        width: 100,
        height: 100,
        style: { fillColor: '#1e293b', strokeColor: '#334155', strokeWidth: 2 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 685,
        y: 65,
        width: 30,
        height: 30,
        content: '⚕',
        style: { fontFamily: 'Inter', fontSize: 24, color: '#3b82f6' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 40,
        width: 500,
        height: 40,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Inter', fontSize: 28, color: '#ffffff', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 80,
        width: 400,
        height: 25,
        content: '{{Doctor.Qualification}} • {{Doctor.Specialty}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#94a3b8' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 105,
        width: 500,
        height: 25,
        content: '{{Doctor.Clinic}} | {{Doctor.Address}} | Ph: {{Doctor.Phone}}',
        style: { fontFamily: 'Inter', fontSize: 12, color: '#64748b' }
      },
      // Prescription section with dark accent
      {
        id: nanoid(),
        type: 'rectangle',
        x: 30,
        y: 170,
        width: 10,
        height: 400,
        style: { fillColor: '#3b82f6', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 60,
        y: 180,
        width: 200,
        height: 30,
        content: 'PRESCRIPTION',
        style: { fontFamily: 'Inter', fontSize: 18, color: '#0f172a', fontWeight: 'bold' }
      }
    ]
  },
  {
    id: 'colorful-modern',
    name: 'Colorful Modern',
    category: 'colorful',
    tags: ['gradient', 'modern', 'vibrant'],
    popularity: 'new',
    premium: false,
    elements: [
      // Rainbow top border
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 794,
        height: 8,
        style: { fillColor: '#3b82f6', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 8,
        width: 794,
        height: 4,
        style: { fillColor: '#8b5cf6', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 12,
        width: 794,
        height: 4,
        style: { fillColor: '#06d6a0', strokeColor: 'transparent' }
      },
      // Circular accent
      {
        id: nanoid(),
        type: 'circle',
        x: 20,
        y: 40,
        width: 80,
        height: 80,
        style: { fillColor: '#f0f9ff', strokeColor: '#3b82f6', strokeWidth: 3 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 45,
        y: 75,
        width: 30,
        height: 30,
        content: 'Rx',
        style: { fontFamily: 'Poppins', fontSize: 18, color: '#3b82f6', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 120,
        y: 50,
        width: 400,
        height: 35,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Poppins', fontSize: 22, color: '#1e293b', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 120,
        y: 85,
        width: 300,
        height: 25,
        content: '{{Doctor.Qualification}} - {{Doctor.Specialty}}',
        style: { fontFamily: 'Poppins', fontSize: 14, color: '#3b82f6', fontWeight: '500' }
      },
      // Colorful side accent
      {
        id: nanoid(),
        type: 'rectangle',
        x: 50,
        y: 150,
        width: 4,
        height: 200,
        style: { fillColor: '#3b82f6', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'rectangle',
        x: 58,
        y: 150,
        width: 4,
        height: 200,
        style: { fillColor: '#8b5cf6', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 80,
        y: 160,
        width: 200,
        height: 30,
        content: 'PRESCRIPTION',
        style: { fontFamily: 'Poppins', fontSize: 16, color: '#374151', fontWeight: '600' }
      }
    ]
  },
  {
    id: 'elegant-simple',
    name: 'Elegant Simple',
    category: 'minimal',
    tags: ['elegant', 'simple', 'serif'],
    popularity: 'popular',
    premium: false,
    elements: [
      // Centered layout with elegant typography
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 80,
        width: 694,
        height: 50,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Georgia', fontSize: 32, color: '#374151', fontWeight: 'normal', textAlign: 'center' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 135,
        width: 694,
        height: 25,
        content: '{{Doctor.Qualification}}',
        style: { fontFamily: 'Georgia', fontSize: 16, color: '#6b7280', fontStyle: 'italic', textAlign: 'center' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 165,
        width: 694,
        height: 25,
        content: '{{Doctor.Specialty}} • {{Doctor.Address}}',
        style: { fontFamily: 'Georgia', fontSize: 12, color: '#9ca3af', textAlign: 'center' }
      },
      // Decorative flourish
      {
        id: nanoid(),
        type: 'line',
        x: 297,
        y: 210,
        width: 200,
        height: 1,
        style: { strokeColor: '#d1d5db', strokeWidth: 1 }
      },
      {
        id: nanoid(),
        type: 'circle',
        x: 392,
        y: 205,
        width: 10,
        height: 10,
        style: { fillColor: '#d1d5db', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 250,
        width: 694,
        height: 40,
        content: '— Prescription —',
        style: { fontFamily: 'Georgia', fontSize: 20, color: '#4b5563', textAlign: 'center', fontStyle: 'italic' }
      }
    ]
  },
  {
    id: 'clinic-header',
    name: 'Clinic Header',
    category: 'colorful',
    tags: ['clinic', 'warm', 'yellow'],
    popularity: 'popular',
    premium: false,
    elements: [
      // Warm clinic-style header
      {
        id: nanoid(),
        type: 'rectangle',
        x: 30,
        y: 30,
        width: 734,
        height: 100,
        style: { fillColor: '#fef3c7', strokeColor: '#f59e0b', strokeWidth: 3, borderRadius: 15 }
      },
      // Inner highlight
      {
        id: nanoid(),
        type: 'rectangle',
        x: 40,
        y: 40,
        width: 714,
        height: 80,
        style: { fillColor: '#fffbeb', strokeColor: '#fbbf24', strokeWidth: 1, borderRadius: 10 }
      },
      // Clinic logo placeholder
      {
        id: nanoid(),
        type: 'circle',
        x: 60,
        y: 50,
        width: 60,
        height: 60,
        style: { fillColor: '#f59e0b', strokeColor: '#d97706', strokeWidth: 2 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 82,
        y: 75,
        width: 16,
        height: 16,
        content: '+',
        style: { fontFamily: 'Inter', fontSize: 20, color: '#ffffff', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 140,
        y: 55,
        width: 400,
        height: 25,
        content: '{{Clinic.Name}}',
        style: { fontFamily: 'Inter', fontSize: 20, color: '#92400e', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 140,
        y: 80,
        width: 400,
        height: 25,
        content: 'Dr. {{Doctor.FullName}} - {{Doctor.Qualification}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#78350f', fontWeight: '500' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 140,
        y: 100,
        width: 500,
        height: 20,
        content: '{{Doctor.Address}} | Contact: {{Doctor.Phone}}',
        style: { fontFamily: 'Inter', fontSize: 11, color: '#a16207' }
      },
      // Banner style prescription title
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 150,
        width: 794,
        height: 40,
        style: { fillColor: '#f59e0b', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 165,
        width: 694,
        height: 30,
        content: 'MEDICAL PRESCRIPTION',
        style: { fontFamily: 'Inter', fontSize: 16, color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }
      }
    ]
  },
  {
    id: 'minimalist-clean',
    name: 'Minimalist Clean',
    category: 'minimal',
    tags: ['clean', 'minimal', 'white'],
    popularity: 'trending',
    premium: false,
    elements: [
      // Ultra-minimal with lots of white space
      {
        id: nanoid(),
        type: 'text',
        x: 100,
        y: 100,
        width: 594,
        height: 60,
        content: '{{Doctor.FullName}}',
        style: { fontFamily: 'Inter', fontSize: 36, color: '#111827', fontWeight: '200', letterSpacing: '-0.5px' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 100,
        y: 170,
        width: 594,
        height: 25,
        content: '{{Doctor.Qualification}} • {{Doctor.Specialty}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }
      },
      // Minimal separator
      {
        id: nanoid(),
        type: 'line',
        x: 100,
        y: 220,
        width: 60,
        height: 1,
        style: { strokeColor: '#e5e7eb', strokeWidth: 1 }
      },
      // Large Rx symbol
      {
        id: nanoid(),
        type: 'text',
        x: 100,
        y: 280,
        width: 100,
        height: 80,
        content: '℞',
        style: { fontFamily: 'Inter', fontSize: 64, color: '#f3f4f6', fontWeight: '100' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 220,
        y: 320,
        width: 150,
        height: 30,
        content: 'Prescription',
        style: { fontFamily: 'Inter', fontSize: 16, color: '#6b7280', fontWeight: '300' }
      }
    ]
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    category: 'modern',
    tags: ['corporate', 'blue', 'professional'],
    popularity: 'popular',
    premium: true,
    elements: [
      // Corporate header with logo area
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 794,
        height: 120,
        style: { fillColor: '#1e40af', strokeColor: 'transparent' }
      },
      // Logo placeholder
      {
        id: nanoid(),
        type: 'rectangle',
        x: 50,
        y: 20,
        width: 80,
        height: 80,
        style: { fillColor: '#3b82f6', strokeColor: '#60a5fa', strokeWidth: 2, borderRadius: 8 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 75,
        y: 55,
        width: 30,
        height: 30,
        content: '⚕',
        style: { fontFamily: 'Inter', fontSize: 24, color: '#ffffff' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 150,
        y: 35,
        width: 400,
        height: 30,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Inter', fontSize: 24, color: '#ffffff', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 150,
        y: 65,
        width: 400,
        height: 25,
        content: '{{Doctor.Qualification}} • {{Doctor.Specialty}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#bfdbfe' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 150,
        y: 85,
        width: 500,
        height: 20,
        content: 'Registration: {{Doctor.RegNo}} | {{Doctor.Address}} | {{Doctor.Phone}}',
        style: { fontFamily: 'Inter', fontSize: 11, color: '#93c5fd' }
      },
      // Corporate info box
      {
        id: nanoid(),
        type: 'rectangle',
        x: 580,
        y: 30,
        width: 180,
        height: 60,
        style: { fillColor: '#1e3a8a', strokeColor: '#3b82f6', strokeWidth: 1, borderRadius: 6 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 590,
        y: 45,
        width: 160,
        height: 15,
        content: 'License No: {{Doctor.License}}',
        style: { fontFamily: 'Inter', fontSize: 10, color: '#bfdbfe' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 590,
        y: 60,
        width: 160,
        height: 15,
        content: 'Valid Until: {{License.Expiry}}',
        style: { fontFamily: 'Inter', fontSize: 10, color: '#bfdbfe' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 590,
        y: 75,
        width: 160,
        height: 15,
        content: 'Date: {{Date}}',
        style: { fontFamily: 'Inter', fontSize: 10, color: '#ffffff', fontWeight: 'bold' }
      },
      // Blue accent line
      {
        id: nanoid(),
        type: 'rectangle',
        x: 50,
        y: 140,
        width: 694,
        height: 3,
        style: { fillColor: '#3b82f6', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 170,
        width: 200,
        height: 30,
        content: 'PRESCRIPTION',
        style: { fontFamily: 'Inter', fontSize: 18, color: '#1e40af', fontWeight: 'bold' }
      }
    ]
  },
  {
    id: 'vintage-classic',
    name: 'Vintage Classic',
    category: 'classic',
    tags: ['vintage', 'ornate', 'traditional'],
    popularity: 'new',
    premium: true,
    elements: [
      // Ornate vintage border
      {
        id: nanoid(),
        type: 'rectangle',
        x: 20,
        y: 20,
        width: 754,
        height: 160,
        style: { fillColor: 'transparent', strokeColor: '#8b4513', strokeWidth: 4, borderRadius: 0 }
      },
      {
        id: nanoid(),
        type: 'rectangle',
        x: 30,
        y: 30,
        width: 734,
        height: 140,
        style: { fillColor: 'transparent', strokeColor: '#a0522d', strokeWidth: 2, borderRadius: 0 }
      },
      // Corner decorations
      {
        id: nanoid(),
        type: 'text',
        x: 40,
        y: 40,
        width: 20,
        height: 20,
        content: '❦',
        style: { fontFamily: 'Times New Roman', fontSize: 16, color: '#8b4513' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 734,
        y: 40,
        width: 20,
        height: 20,
        content: '❦',
        style: { fontFamily: 'Times New Roman', fontSize: 16, color: '#8b4513' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 40,
        y: 150,
        width: 20,
        height: 20,
        content: '❦',
        style: { fontFamily: 'Times New Roman', fontSize: 16, color: '#8b4513' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 734,
        y: 150,
        width: 20,
        height: 20,
        content: '❦',
        style: { fontFamily: 'Times New Roman', fontSize: 16, color: '#8b4513' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 70,
        width: 694,
        height: 35,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Times New Roman', fontSize: 28, color: '#8b4513', fontWeight: 'bold', textAlign: 'center' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 110,
        width: 694,
        height: 25,
        content: '{{Doctor.Qualification}} - {{Doctor.Specialty}}',
        style: { fontFamily: 'Times New Roman', fontSize: 16, color: '#a0522d', textAlign: 'center', fontStyle: 'italic' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 135,
        width: 694,
        height: 25,
        content: '{{Doctor.Address}} • Registration: {{Doctor.RegNo}}',
        style: { fontFamily: 'Times New Roman', fontSize: 12, color: '#8b4513', textAlign: 'center' }
      },
      // Vintage prescription header
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 220,
        width: 694,
        height: 40,
        content: '⚜ MEDICAL PRESCRIPTION ⚜',
        style: { fontFamily: 'Times New Roman', fontSize: 18, color: '#8b4513', fontWeight: 'bold', textAlign: 'center' }
      }
    ]
  },
  {
    id: 'modern-gradient',
    name: 'Modern Gradient',
    category: 'modern',
    tags: ['gradient', 'modern', 'purple'],
    popularity: 'trending',
    premium: true,
    elements: [
      // Gradient background header
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 794,
        height: 180,
        style: { fillColor: '#6366f1', strokeColor: 'transparent' }
      },
      // Overlay gradient effect
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 90,
        width: 794,
        height: 90,
        style: { fillColor: '#8b5cf6', strokeColor: 'transparent', opacity: 0.8 }
      },
      // Geometric accent
      {
        id: nanoid(),
        type: 'circle',
        x: 600,
        y: 30,
        width: 120,
        height: 120,
        style: { fillColor: 'transparent', strokeColor: '#ffffff', strokeWidth: 2, opacity: 0.3 }
      },
      {
        id: nanoid(),
        type: 'circle',
        x: 620,
        y: 50,
        width: 80,
        height: 80,
        style: { fillColor: 'transparent', strokeColor: '#ffffff', strokeWidth: 1, opacity: 0.5 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 50,
        width: 500,
        height: 40,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Inter', fontSize: 26, color: '#ffffff', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 95,
        width: 400,
        height: 25,
        content: '{{Doctor.Qualification}} • {{Doctor.Specialty}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#c7d2fe' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 125,
        width: 500,
        height: 25,
        content: '{{Doctor.Address}} | {{Doctor.Phone}} | {{Doctor.Email}}',
        style: { fontFamily: 'Inter', fontSize: 12, color: '#a5b4fc' }
      },
      // Flowing gradient accent
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 180,
        width: 794,
        height: 8,
        style: { fillColor: '#a855f7', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 188,
        width: 400,
        height: 4,
        style: { fillColor: '#ec4899', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 220,
        width: 200,
        height: 30,
        content: 'PRESCRIPTION',
        style: { fontFamily: 'Inter', fontSize: 18, color: '#6366f1', fontWeight: 'bold' }
      }
    ]
  },
  {
    id: 'simple-border',
    name: 'Simple Border',
    category: 'minimal',
    tags: ['border', 'simple', 'clean'],
    popularity: 'popular',
    premium: false,
    elements: [
      // Full page border frame
      {
        id: nanoid(),
        type: 'rectangle',
        x: 30,
        y: 30,
        width: 734,
        height: 1050,
        style: { fillColor: 'transparent', strokeColor: '#6b7280', strokeWidth: 2, borderRadius: 0 }
      },
      // Inner margin guides
      {
        id: nanoid(),
        type: 'line',
        x: 70,
        y: 70,
        width: 654,
        height: 1,
        style: { strokeColor: '#e5e7eb', strokeWidth: 1 }
      },
      {
        id: nanoid(),
        type: 'line',
        x: 70,
        y: 70,
        width: 1,
        height: 970,
        style: { strokeColor: '#e5e7eb', strokeWidth: 1 }
      },
      {
        id: nanoid(),
        type: 'line',
        x: 724,
        y: 70,
        width: 1,
        height: 970,
        style: { strokeColor: '#e5e7eb', strokeWidth: 1 }
      },
      // Header section
      {
        id: nanoid(),
        type: 'text',
        x: 90,
        y: 90,
        width: 400,
        height: 40,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Inter', fontSize: 24, color: '#1f2937', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 90,
        y: 135,
        width: 300,
        height: 25,
        content: '{{Doctor.Qualification}} - {{Doctor.Specialty}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#6b7280' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 90,
        y: 165,
        width: 500,
        height: 25,
        content: '{{Doctor.Address}} • Ph: {{Doctor.Phone}} • Email: {{Doctor.Email}}',
        style: { fontFamily: 'Inter', fontSize: 12, color: '#9ca3af' }
      },
      // Clean separator
      {
        id: nanoid(),
        type: 'line',
        x: 90,
        y: 210,
        width: 614,
        height: 1,
        style: { strokeColor: '#d1d5db', strokeWidth: 1 }
      },
      // Simple prescription header
      {
        id: nanoid(),
        type: 'text',
        x: 90,
        y: 240,
        width: 200,
        height: 30,
        content: 'PRESCRIPTION',
        style: { fontFamily: 'Inter', fontSize: 16, color: '#374151', fontWeight: 'bold', letterSpacing: '1px' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 550,
        y: 240,
        width: 150,
        height: 25,
        content: 'Date: {{Date}}',
        style: { fontFamily: 'Inter', fontSize: 12, color: '#6b7280' }
      }
    ]
  },
  {
    id: 'pharmacy-green',
    name: 'Pharmacy Green',
    category: 'colorful',
    tags: ['green', 'pharmacy', 'medical'],
    popularity: 'new',
    premium: false,
    elements: [
      // Medical green theme
      {
        id: nanoid(),
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 794,
        height: 12,
        style: { fillColor: '#059669', strokeColor: 'transparent' }
      },
      // Cross symbol background
      {
        id: nanoid(),
        type: 'rectangle',
        x: 30,
        y: 30,
        width: 100,
        height: 100,
        style: { fillColor: '#ecfdf5', strokeColor: '#10b981', strokeWidth: 2, borderRadius: 50 }
      },
      // Medical cross
      {
        id: nanoid(),
        type: 'rectangle',
        x: 70,
        y: 50,
        width: 20,
        height: 60,
        style: { fillColor: '#059669', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'rectangle',
        x: 50,
        y: 70,
        width: 60,
        height: 20,
        style: { fillColor: '#059669', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 150,
        y: 50,
        width: 400,
        height: 40,
        content: 'Dr. {{Doctor.FullName}}',
        style: { fontFamily: 'Inter', fontSize: 24, color: '#065f46', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 150,
        y: 90,
        width: 300,
        height: 25,
        content: '{{Doctor.Qualification}} - {{Doctor.Specialty}}',
        style: { fontFamily: 'Inter', fontSize: 14, color: '#047857', fontWeight: '500' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 150,
        y: 115,
        width: 500,
        height: 20,
        content: 'Registered Medical Practitioner • {{Doctor.RegNo}}',
        style: { fontFamily: 'Inter', fontSize: 11, color: '#059669' }
      },
      // Pharmacy-style info box
      {
        id: nanoid(),
        type: 'rectangle',
        x: 580,
        y: 40,
        width: 180,
        height: 80,
        style: { fillColor: '#f0fdf4', strokeColor: '#22c55e', strokeWidth: 1, borderRadius: 8 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 590,
        y: 55,
        width: 160,
        height: 15,
        content: 'Clinic: {{Doctor.Clinic}}',
        style: { fontFamily: 'Inter', fontSize: 10, color: '#065f46', fontWeight: 'bold' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 590,
        y: 70,
        width: 160,
        height: 15,
        content: 'Address: {{Doctor.Address}}',
        style: { fontFamily: 'Inter', fontSize: 9, color: '#047857' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 590,
        y: 85,
        width: 160,
        height: 15,
        content: 'Phone: {{Doctor.Phone}}',
        style: { fontFamily: 'Inter', fontSize: 9, color: '#047857' }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 590,
        y: 100,
        width: 160,
        height: 15,
        content: 'Date: {{Date}}',
        style: { fontFamily: 'Inter', fontSize: 10, color: '#065f46', fontWeight: 'bold' }
      },
      // Green accent bars
      {
        id: nanoid(),
        type: 'rectangle',
        x: 40,
        y: 160,
        width: 8,
        height: 400,
        style: { fillColor: '#10b981', strokeColor: 'transparent' }
      },
      {
        id: nanoid(),
        type: 'rectangle',
        x: 52,
        y: 160,
        width: 4,
        height: 400,
        style: { fillColor: '#34d399', strokeColor: 'transparent' }
      },
      // Prescription section
      {
        id: nanoid(),
        type: 'rectangle',
        x: 70,
        y: 150,
        width: 674,
        height: 40,
        style: { fillColor: '#ecfdf5', strokeColor: 'transparent', borderRadius: 6 }
      },
      {
        id: nanoid(),
        type: 'text',
        x: 90,
        y: 165,
        width: 200,
        height: 30,
        content: '📋 PRESCRIPTION',
        style: { fontFamily: 'Inter', fontSize: 16, color: '#065f46', fontWeight: 'bold' }
      }
    ]
  }
];

const PrescriptionTemplates = ({ onSelectTemplate, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState([]);

  const toggleFavorite = (templateId) => {
    setFavorites(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const filteredTemplates = PRESCRIPTION_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getPopularityIcon = (popularity) => {
    switch (popularity) {
      case 'trending': return <Zap className="h-3 w-3 text-orange-500" />;
      case 'new': return <Sparkles className="h-3 w-3 text-green-500" />;
      case 'popular': return <Heart className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  const getPopularityColor = (popularity) => {
    switch (popularity) {
      case 'trending': return 'bg-orange-100 text-orange-800';
      case 'new': return 'bg-green-100 text-green-800';
      case 'popular': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-96 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Grid className="h-5 w-5" />
            Templates
          </h3>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search templates..." 
            className="pl-10 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="space-y-2">
          {TEMPLATE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <div className="flex items-center justify-between">
                <span>{category.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {category.count}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className={`${viewMode === 'grid' ? 'grid gap-4' : 'space-y-3'}`}>
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`group cursor-pointer bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 ${
                viewMode === 'list' ? 'flex items-center p-3' : ''
              }`}
              onClick={() => onSelectTemplate(template)}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-xl flex items-center justify-center relative overflow-hidden">
                    <div className="text-gray-400 text-xs font-medium">Preview</div>
                    
                    {/* Preview overlay with template colors */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity ${
                      template.category === 'modern' ? 'bg-gradient-to-br from-blue-500 to-purple-500' :
                      template.category === 'classic' ? 'bg-gradient-to-br from-gray-600 to-gray-800' :
                      template.category === 'minimal' ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                      'bg-gradient-to-br from-green-400 to-blue-500'
                    }`} />
                    
                    {/* Premium badge */}
                    {template.premium && (
                      <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        Pro
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                        {template.name}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(template.id);
                        }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Heart 
                          className={`h-4 w-4 ${
                            favorites.includes(template.id) ? 'fill-red-500 text-red-500' : ''
                          }`} 
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs flex items-center gap-1 ${getPopularityColor(template.popularity)}`}
                      >
                        {getPopularityIcon(template.popularity)}
                        {template.popularity}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-2 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden mr-3">
                    <div className="text-gray-400 text-xs">Prev</div>
                    {template.premium && (
                      <Crown className="absolute top-1 right-1 h-3 w-3 text-yellow-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-sm text-gray-900">{template.name}</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(template.id);
                        }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Heart 
                          className={`h-4 w-4 ${
                            favorites.includes(template.id) ? 'fill-red-500 text-red-500' : ''
                          }`} 
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs flex items-center gap-1 ${getPopularityColor(template.popularity)}`}
                      >
                        {getPopularityIcon(template.popularity)}
                        {template.popularity}
                      </Badge>
                      <div className="flex gap-1">
                        {template.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-2 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-sm text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            {filteredTemplates.length} of {PRESCRIPTION_TEMPLATES.length} templates
          </p>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Template
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionTemplates;