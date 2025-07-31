
"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function PersonalizedHero() {
  const greeting = "Welcome to BlueRide";
  const highlight = "Your reliable water ride, just a tap away. Safe, affordable, and always on time.";

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
                <>
                  <h1 className="font-headline text-4xl font-extrabold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    {greeting}
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    {highlight}
                  </p>
                </>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
               <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-transform hover:scale-105">
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
          <Image
            alt="A group of boats floating on top of a large body of water"
            className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center shadow-2xl sm:w-full lg:order-last lg:aspect-square"
            data-ai-hint="boats harbor"
            height="550"
            src="https://images.unsplash.com/photo-1627923769935-37651a793a39?q=80&w=2070&auto=format&fit=crop"
            width="550"
            priority
          />
        </div>
      </div>
    </section>
  );
}
