import { getCountry } from '@/lib/country';

export function CountryBadge({ extraFields, className = '' }: { extraFields: unknown; className?: string }) {
  const country = getCountry(extraFields);
  if (!country) return null;
  return (
    <span className={`inline-flex items-center gap-2 font-black uppercase text-white min-w-0 ${className}`}>
      {country.flag && <span aria-hidden="true" className="text-3xl leading-none shrink-0">{country.flag}</span>}
      <span className="break-words">{country.name}</span>
    </span>
  );
}
