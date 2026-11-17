import { useState } from 'react';
import { Select, Input } from '../ui/Field';
import Button from '../ui/Button';

export default function ProductFilters({ filters, categories, onChange, onReset }) {
  const [search, setSearch] = useState(filters.q || '');

  return (
    <form
      className="surface space-y-5 p-4"
      onSubmit={(event) => { event.preventDefault(); onChange({ q: search, page: 1 }); }}
    >
      <div>
        <h2 className="text-sm font-semibold">Refine</h2>
        <p className="mt-0.5 text-xs text-muted">Filter the catalog server-side.</p>
      </div>
      <Input
        id="filter-search"
        label="Search"
        placeholder="Keyword"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select
        id="filter-category"
        label="Category"
        value={filters.category || ''}
        onChange={(event) => onChange({ category: event.target.value, page: 1 })}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category._id} value={category.slug}>{category.name}</option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <Input
          id="filter-min"
          label="Min price"
          inputMode="numeric"
          placeholder="0"
          value={filters.minPrice || ''}
          onChange={(event) => onChange({ minPrice: event.target.value, page: 1 })}
        />
        <Input
          id="filter-max"
          label="Max price"
          inputMode="numeric"
          placeholder="Any"
          value={filters.maxPrice || ''}
          onChange={(event) => onChange({ maxPrice: event.target.value, page: 1 })}
        />
      </div>
      <Select
        id="filter-sort"
        label="Sort by"
        value={filters.sort || 'newest'}
        onChange={(event) => onChange({ sort: event.target.value, page: 1 })}
      >
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="name">Name</option>
      </Select>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Apply</Button>
        <Button type="button" variant="secondary" onClick={onReset}>Clear</Button>
      </div>
    </form>
  );
}
