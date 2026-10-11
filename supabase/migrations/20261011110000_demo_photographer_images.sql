-- Photos for the demo photographer accounts (files live in public/demo).
UPDATE public.profiles SET
  avatar_url = '/demo/layla-avatar.jpg',
  cover_url = '/demo/layla-cover.jpg',
  portfolio_urls = ARRAY['/demo/layla-1.jpg','/demo/layla-2.jpg','/demo/layla-3.jpg','/demo/layla-4.jpg']
WHERE id = '11111111-1111-4111-8111-000000000001';

UPDATE public.profiles SET
  avatar_url = '/demo/noor-avatar.jpg',
  cover_url = '/demo/noor-cover.jpg',
  portfolio_urls = ARRAY['/demo/noor-1.jpg','/demo/noor-2.jpg','/demo/noor-3.jpg','/demo/noor-4.jpg','/demo/noor-5.jpg']
WHERE id = '11111111-1111-4111-8111-000000000002';
