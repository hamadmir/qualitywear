# Quality Wear: Men's Clothing Store

Next.js 15 (TypeScript) + Supabase (database, login, pictures) + Tailwind CSS.

## Kya kya bana hua hai

**Customer website**
- `/`: Home page (hero, categories, featured, new arrivals)
- `/shop`: Sab products, category, size, sort aur search filter ke saath
- `/product/[slug]`: Product page (pictures, size/color, stock, Add to Cart, WhatsApp order)
- `/cart`, `/checkout`: Cart aur Cash on Delivery checkout
- `/order-success`, `/track`: Order number milta hai, aur order number + phone se tracking

**Admin panel** (`/admin`)
- Dashboard: aaj ki sale, pending orders, 30 din ki sale, top selling, kam stock
- Orders: list, filter, search, detail, status badalna, Call/WhatsApp customer
- Products: add/edit/delete, multiple pictures (khud chhoti ho kar upload hoti hain), sizes/colors/stock
- Categories: picture aur tarteeb ke saath
- Settings: WhatsApp number, delivery charges, free delivery limit

**Security**
- Customer sirf products dekh sakta hai. Price, stock ya orders sirf admin badal sakta hai.
- Order ki qeemat database khud products ki price se nikalta hai, browser se nahi leta.
- Order hone par stock khud kam hota hai, aur cancel karne par wapas aa jata hai.

## Setup

1. **Supabase**: project banayein → SQL Editor mein `supabase/migrations/001_init.sql` chalayein.
2. **Admin user**: Supabase → Authentication → Users → "Add user" (email + password, "Auto confirm" on).
   Phir SQL Editor mein yeh chalayein:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'aapki@email.com';
   ```
3. **Keys**: `.env.example` ko `.env.local` mein copy karein, aur Supabase → Project Settings → API se
   URL aur anon/publishable key daalein.
4. **Chalayein**:
   ```bash
   npm install
   npm run dev
   ```
   Website: http://localhost:3000 · Admin: http://localhost:3000/admin

## Online karna (Vercel)

1. Yeh folder GitHub par repository bana kar upload karein.
2. vercel.com → "Add New Project" → GitHub repo choose karein.
3. Environment Variables mein `NEXT_PUBLIC_SUPABASE_URL` aur `NEXT_PUBLIC_SUPABASE_ANON_KEY` daalein → Deploy.
4. Apna domain (jaise qualitywear.pk) Vercel → Settings → Domains mein lagayein.
