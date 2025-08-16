
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-6 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Image src="/boatlogo.jpg" alt="BlueRide Logo" width={32} height={32} className="h-8 w-8 rounded-md" />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {year} BlueRide Inc. All rights reserved.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <Link
            href="#"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            href="#"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About Us
          </Link>
        </nav>
      </div>
    </footer>
  );
}
