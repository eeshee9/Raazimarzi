// website/src/app/api/cms/auth/login/route.js
// Handles CMS login — separate from application/ admin login

import { NextResponse } from 'next/server';
import { connectDB } from '@/libraries/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// CMS User model (separate from application/ users)
import CmsUser from '@/models/CmsUser';

export async function POST(request) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
    }

    // Find CMS user
    const user = await CmsUser.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Check password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.CMS_JWT_SECRET || 'cms-secret-change-in-production',
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    const cookieStore = cookies();
    cookieStore.set('cms_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: { email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('CMS login error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}