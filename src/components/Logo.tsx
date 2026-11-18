import logo from '../assets/saatio-logo.svg';
import logoWhite from '../assets/saatio-logo-white.svg';
import symbol from '../assets/saatio-symbol.svg';
import icon from '../assets/saatio-app-icon.svg';

// The approved Saatio logo, as clean SVG. Inlined so it stays sharp at every size.
const strip = (svg: string) => svg.replace(/ role="img" aria-label="Saatio"/, ' aria-hidden="true" focusable="false"');
export function Logo({ light, className = '' }: { light?: boolean; className?: string }) {
  return <span className={`logo ${className}`} role="img" aria-label="Saatio" dangerouslySetInnerHTML={{ __html: strip(light ? logoWhite : logo) }} />;
}
export function Symbol({ className = '' }: { className?: string }) {
  return <span className={`sym ${className}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: strip(symbol) }} />;
}
export const iconSvg = icon;
