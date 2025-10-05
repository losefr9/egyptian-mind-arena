-- تحديث صور الألعاب لتكون أكثر جاذبية

UPDATE games 
SET image_url = 'https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=800&q=80'
WHERE name = 'لودو';

UPDATE games 
SET image_url = 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=800&q=80'
WHERE name = 'دومينو';

UPDATE games 
SET image_url = 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&q=80'
WHERE name = 'شطرنج';

UPDATE games 
SET image_url = '/xo-game-image.jpg',
    description = 'لعبة XO التحدي - أجب على الأسئلة الرياضية لتحصل على الدور'
WHERE name = 'XO Game';