// // website/src/models/CmsUser.js
// // Separate users table for CMS/SEO team — not the same as application/ users

// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const cmsUserSchema = new Schema({
//   name:         { type: String, required: true, trim: true },
//   email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
//   passwordHash: { type: String, required: true },
//   role:         { type: String, enum: ['seo_manager', 'content_editor', 'admin'], default: 'content_editor' },
//   isActive:     { type: Boolean, default: true },
// }, { timestamps: true });

// cmsUserSchema.index({ email: 1 });

// const CmsUser = mongoose.models.CmsUser || mongoose.model('CmsUser', cmsUserSchema);
// export default CmsUser;


// // ─────────────────────────────────────────────────────────────
// // HOW TO CREATE THE FIRST CMS USER (run once in your terminal)
// // ─────────────────────────────────────────────────────────────
// // Create a file: scripts/createCmsUser.js and run it once:
// //
// // import bcrypt from 'bcryptjs';
// // import mongoose from 'mongoose';
// // import CmsUser from '../src/models/CmsUser.js';
// //
// // await mongoose.connect(process.env.MONGODB_URI);
// // const hash = await bcrypt.hash('YourPassword123!', 12);
// // await CmsUser.create({
// //   name: 'SEO Manager',
// //   email: 'seo@raazimarzi.com',
// //   passwordHash: hash,
// //   role: 'seo_manager',
// // });
// // console.log('CMS user created!');
// // process.exit(0);
// //
// // Run: node scripts/createCmsUser.js



