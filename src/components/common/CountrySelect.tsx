import { useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronDown, FiSearch } from 'react-icons/fi'
import clsx from 'clsx'
import { COUNTRIES, flagFromIso2, type Country } from '../../lib/countries'

type CountrySelectProps = {
  value: Country
  onChange: (country: Country) => void
  className?: string
  disabled?: boolean
}

export function CountrySelect({
  value,
  onChange,
  className,
  disabled,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [isOpen])

  const toggleOpen = () => {
    setIsOpen((open) => {
      if (open) setQuery('')
      return !open
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter((c) => {
      const flat = `${c.name} ${c.iso2} ${c.dial_code}`.toLowerCase()
      return flat.includes(q)
    })
  }, [query])

  const handleSelect = (country: Country) => {
    onChange(country)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div ref={wrapperRef} className={clsx('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className="inline-flex h-full items-center gap-2 pr-2 text-left text-base text-black disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-xl leading-none" aria-hidden="true">
          {flagFromIso2(value.iso2)}
        </span>
        <span className="text-base text-black">{value.dial_code}</span>
        <FiChevronDown className="h-4 w-4 text-black" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[300px] overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_18px_32px_rgba(31,41,55,0.18)]">
          <div className="flex items-center gap-2 border-b border-[#eef1f5] px-3 py-2">
            <FiSearch className="h-4 w-4 text-[#64748b]" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country..."
              className="h-9 w-full bg-transparent text-sm text-black outline-none placeholder:text-[#94a3b8]"
              aria-label="Search country"
            />
          </div>

          <ul
            role="listbox"
            className="max-h-[260px] overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[#64748b]">
                No countries found
              </li>
            ) : (
              filtered.map((country) => {
                const isActive = country.iso2 === value.iso2
                return (
                  <li key={country.iso2} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => handleSelect(country)}
                      className={clsx(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition',
                        isActive
                          ? 'bg-violet-50 text-[#8a37ff]'
                          : 'text-black hover:bg-[#f5f7fb]',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="text-xl leading-none" aria-hidden="true">
                          {flagFromIso2(country.iso2)}
                        </span>
                        <span className="truncate">{country.name}</span>
                      </span>
                      <span className="shrink-0 text-[#64748b]">
                        {country.dial_code}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
