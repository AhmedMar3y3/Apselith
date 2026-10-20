import { ArrowUpRight, Heart } from 'lucide-react';
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="creator-credit">
        Built by{' '}
        <a
          href="https://ahmed-mar3y.space"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ahmed Mar3y <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </span>
      <div className="relief-message">
        <Heart size={14} aria-hidden="true" />
        <span>
          Free to explore.{' '}
          <a
            href="https://www.pcrf.net/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Help support Gaza relief{' '}
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </span>
      </div>
      <span className="footer-signature">OUR PLANET. OUR SHARED HOME.</span>
    </footer>
  );
}
