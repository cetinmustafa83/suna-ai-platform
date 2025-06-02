// 'use client'; // Removed to make this a Server Component for generateMetadata

// import { useEffect, useState } from 'react'; // Not needed if it's a Server Component
import { Metadata } from 'next'; // Import Metadata type
import { getPublicPageSEO } from '@/lib/api-admin'; // Assuming this path is correct and function exists
import { CTASection } from '@/components/home/sections/cta-section';
// import { FAQSection } from "@/components/sections/faq-section";
import { FooterSection } from '@/components/home/sections/footer-section';
import { HeroSection } from '@/components/home/sections/hero-section';
import { OpenSourceSection } from '@/components/home/sections/open-source-section';
import { PricingSection } from '@/components/home/sections/pricing-section';
import { UseCasesSection } from '@/components/home/sections/use-cases-section';
import { ModalProviders } from '@/providers/modal-providers';

// Server-side function to generate metadata
export async function generateMetadata(): Promise<Metadata> {
  const pageSlug = "homepage"; 
  const seoData = await getPublicPageSEO(pageSlug);

  if (seoData) {
    const keywords = seoData.keywords ? seoData.keywords.split(',').map(k => k.trim()) : undefined;
    // Ensure title and description are either strings or undefined, not null
    const title = seoData.title || undefined;
    const description = seoData.description || undefined;

    return {
      title: title,
      description: description,
      keywords: keywords,
    };
  }

  // Optional: Return default metadata for this page if no specific SEO data is found
  // These will be processed by the template in the root layout if not null/undefined
  return {
    title: "Suna - AI Employee (Homepage)", // Example default
    description: "Welcome to Suna, your AI Employee for automating tasks.",
  };
}

export default function Home() {
  return (
    <>
      <ModalProviders />
      <main className="flex flex-col items-center justify-center min-h-screen w-full">
        <div className="w-full divide-y divide-border">
          <HeroSection />
          <UseCasesSection />
          {/* <CompanyShowcase /> */}
          {/* <BentoSection /> */}
          {/* <QuoteSection /> */}
          {/* <FeatureSection /> */}
          {/* <GrowthSection /> */}
          <OpenSourceSection />
          <PricingSection />
          {/* <TestimonialSection /> */}
          {/* <FAQSection /> */}
          <CTASection />
          <FooterSection />
        </div>
      </main>
    </>
  );
}
