export interface InstagramPost {
  id: string;
  type: 'image' | 'video';
  mediaUrl: string; // Video URL (.mp4) or high-res image
  thumbnailUrl: string; // Cover image
  caption: string;
  likes: number;
  views?: number;
  audioTrack?: string;
  date: string;
  tags: string[];
  productSlug?: string;
  productName?: string;
  productPrice?: number;
  instagramUrl: string;
}

export const instagramFeedData: InstagramPost[] = [
  {
    id: 'insta-reel-1',
    type: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-traditional-indian-dress-41132-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=85',
    caption: 'Royal Crimson Bridal Lehenga in motion ✨ Handcrafted with zardozi, dabka, and heirloom pearls. Bespoke orders now open for the wedding season.',
    likes: 2480,
    views: 18600,
    audioTrack: '♫ Allura Boutique • Original Bridal Sitar & Tabla',
    date: '2 DAYS AGO',
    tags: ['#AlluraBridal', '#SouthIndianBride', '#KeralaBoutique', '#BespokeCouture'],
    productSlug: 'royal-crimson-bridal-lehenga',
    productName: 'Royal Crimson Bridal Lehenga',
    productPrice: 18999,
    instagramUrl: 'https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg==',
  },
  {
    id: 'insta-reel-2',
    type: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-model-posing-in-a-chic-studio-fashion-shoot-41129-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=85',
    caption: 'Effortless pleats for modern evenings. Our Dusty Mauve Co-ord set is a seasonal must-have 🤍 Styled by @alluraboutiqueofficial',
    likes: 1940,
    views: 14200,
    audioTrack: '♫ Aesthetic Lo-fi • Lounge Vibes',
    date: '4 DAYS AGO',
    tags: ['#ModernElegance', '#PleatedCoord', '#AlluraWomen', '#WesternWear'],
    productSlug: 'pleated-co-ord-set',
    productName: 'Pleated Co-ord Set',
    productPrice: 5499,
    instagramUrl: 'https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg==',
  },
  {
    id: 'insta-post-3',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=85',
    caption: 'Intricate zari and sequin border detailing on pure georgette. Every stitch tells a story of heritage artistry. 🕊️',
    likes: 1350,
    date: '5 DAYS AGO',
    tags: ['#ArtisanCraft', '#HandloomLove', '#EthnicLuxury', '#Perinthalmanna'],
    productSlug: 'embroidered-anarkali-set',
    productName: 'Embroidered Anarkali Set',
    productPrice: 8999,
    instagramUrl: 'https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg==',
  },
  {
    id: 'insta-reel-4',
    type: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-spinning-in-a-flowing-dress-41130-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=85',
    caption: 'The dramatic Noir Georgette Maxi Gown with cascading tiers. Perfect for cocktail nights and gala receptions 🖤',
    likes: 2890,
    views: 22100,
    audioTrack: '♫ Cinematic Strings • Midnight Romance',
    date: '1 WEEK AGO',
    tags: ['#PartyWear', '#NoirCollection', '#MaxiGown', '#AlluraGlam'],
    productSlug: 'western-maxi-dress',
    productName: 'Western Maxi Dress',
    productPrice: 5999,
    instagramUrl: 'https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg==',
  },
  {
    id: 'insta-post-5',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=85',
    caption: 'Festive Emerald Kurta Set featuring Banarasi katan silk weaves. Ready for your celebrations at Ooty Road, Perinthalmanna. 🌿',
    likes: 1720,
    date: '1 WEEK AGO',
    tags: ['#EmeraldSilk', '#FestiveEdit', '#PerinthalmannaBoutique', '#KeralaFashion'],
    productSlug: 'emerald-festive-silk-set',
    productName: 'Emerald Festive Silk Set',
    productPrice: 9499,
    instagramUrl: 'https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg==',
  },
  {
    id: 'insta-post-6',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=85',
    caption: 'Botanical hand-block print kurta on airy chanderi silk. Lightweight elegance for daytime festive gatherings ✨',
    likes: 1180,
    date: '2 WEEKS AGO',
    tags: ['#ChanderiSilk', '#BotanicalPrints', '#ComfortChic', '#DaytimeWear'],
    productSlug: 'printed-kurta-set',
    productName: 'Printed Kurta Set',
    productPrice: 4299,
    instagramUrl: 'https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg==',
  },
  {
    id: 'insta-reel-7',
    type: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-long-hair-modeling-in-a-studio-41131-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=85',
    caption: 'Inside our Perinthalmanna flagship boutique. Come experience bespoke tailoring and bridal consultations in person 📍',
    likes: 3120,
    views: 29500,
    audioTrack: '♫ Gentle Acoustic • Sunday Morning',
    date: '2 WEEKS AGO',
    tags: ['#AlluraExperience', '#BoutiqueVibes', '#KeralaStyling', '#Perinthalmanna'],
    instagramUrl: 'https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg==',
  },
];
