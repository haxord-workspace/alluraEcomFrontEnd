import React from 'react';
import { MessageCircle } from 'lucide-react';

export const SizeGuidePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-[11px] font-sans font-bold tracking-[0.28em] uppercase text-allura-goldDark">
          PERFECT FIT PROMISE
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal uppercase tracking-tight">
          ALLURA SIZE & MEASUREMENT GUIDE
        </h1>
        <p className="text-xs sm:text-sm text-allura-muted font-sans max-w-lg mx-auto leading-relaxed">
          Every Allura garment is tailored to flatter traditional and contemporary body proportions. Find your precise fit below.
        </p>
      </div>

      {/* Main Standard Size Table */}
      <div className="bg-allura-card rounded-2xl border border-allura-border p-6 sm:p-8 shadow-subtle space-y-6">
        <h2 className="font-serif text-xl font-semibold uppercase text-allura-text tracking-wide">
          Standard Garment Measurements (Inches)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left font-sans border-collapse">
            <thead>
              <tr className="bg-allura-bgSecondary text-allura-darkBrown font-bold border-b border-allura-border">
                <th className="p-3">Size</th>
                <th className="p-3">Bust (in)</th>
                <th className="p-3">Waist (in)</th>
                <th className="p-3">Hip (in)</th>
                <th className="p-3">Kurta Length (in)</th>
                <th className="p-3">Trouser Length (in)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-allura-border/60 text-allura-text">
              <tr><td className="p-3 font-bold">XS</td><td className="p-3">32 - 34</td><td className="p-3">26 - 28</td><td className="p-3">36 - 38</td><td className="p-3">48</td><td className="p-3">37</td></tr>
              <tr><td className="p-3 font-bold">S</td><td className="p-3">34 - 36</td><td className="p-3">28 - 30</td><td className="p-3">38 - 40</td><td className="p-3">49</td><td className="p-3">38</td></tr>
              <tr><td className="p-3 font-bold">M</td><td className="p-3">36 - 38</td><td className="p-3">30 - 32</td><td className="p-3">40 - 42</td><td className="p-3">50</td><td className="p-3">38</td></tr>
              <tr><td className="p-3 font-bold">L</td><td className="p-3">38 - 40</td><td className="p-3">32 - 34</td><td className="p-3">42 - 44</td><td className="p-3">50</td><td className="p-3">39</td></tr>
              <tr><td className="p-3 font-bold">XL</td><td className="p-3">40 - 42</td><td className="p-3">34 - 36</td><td className="p-3">44 - 46</td><td className="p-3">51</td><td className="p-3">39</td></tr>
              <tr><td className="p-3 font-bold">XXL</td><td className="p-3">42 - 44</td><td className="p-3">36 - 38</td><td className="p-3">46 - 48</td><td className="p-3">51</td><td className="p-3">40</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Measuring Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-allura-card rounded-xl border border-allura-border space-y-2">
          <h4 className="font-serif font-semibold text-allura-text">1. Bust</h4>
          <p className="text-xs text-allura-muted font-sans leading-relaxed">
            Wrap the tape around the fullest part of your bust while keeping tape straight across your back.
          </p>
        </div>
        <div className="p-6 bg-allura-card rounded-xl border border-allura-border space-y-2">
          <h4 className="font-serif font-semibold text-allura-text">2. Waist</h4>
          <p className="text-xs text-allura-muted font-sans leading-relaxed">
            Measure at the narrowest circumference of your torso, typically an inch above the navel.
          </p>
        </div>
        <div className="p-6 bg-allura-card rounded-xl border border-allura-border space-y-2">
          <h4 className="font-serif font-semibold text-allura-text">3. Hips</h4>
          <p className="text-xs text-allura-muted font-sans leading-relaxed">
            Stand straight with feet together and measure around the fullest curve of your hips.
          </p>
        </div>
      </div>

      {/* WhatsApp Stylist Help */}
      <div className="bg-allura-bgSecondary/60 rounded-xl p-8 border border-allura-border text-center space-y-4">
        <h3 className="font-serif text-2xl font-normal text-allura-text uppercase">
          Still unsure between two sizes?
        </h3>
        <p className="text-xs text-allura-muted max-w-md mx-auto">
          Send your measurements to our resident stylist in Perinthalmanna for bespoke fit recommendations.
        </p>
        <a
          href="https://wa.me/919037991774?text=Hello%20Allura%20Stylist%2C%20I%20need%20help%20choosing%20the%20right%20size%20for%20my%20order."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-sm transition-all"
        >
          <MessageCircle size={15} />
          <span>CONSULT STYLIST ON WHATSAPP</span>
        </a>
      </div>
    </div>
  );
};
