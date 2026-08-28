import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { availableFiles, getProductImageUrl } from '../src/data/products.js'

test('every local catalog product points to its existing provided image', async () => {
  assert.equal(availableFiles.length, 17)
  await Promise.all(availableFiles.map((file) => access(new URL(`../public/img_wf/${file}`, import.meta.url))))
  availableFiles.forEach((file) => assert.equal(getProductImageUrl({ image: `/img_wf/${file}` }), `/img_wf/${file}`))
})

test('missing, external, data and invented local images do not produce an image URL', () => {
  assert.equal(getProductImageUrl(null), null)
  assert.equal(getProductImageUrl({ image: 'https://images.example/product.jpg' }), null)
  assert.equal(getProductImageUrl({ image: 'data:image/png;base64,AAAA' }), null)
  assert.equal(getProductImageUrl({ image: '/img_wf/invented.jpg' }), null)
})

test('product views contain no broken placeholder or stock-photo host', async () => {
  const files = [
    '../src/components/ProductCard.jsx', '../src/components/CartItem.jsx', '../src/components/Hero.jsx',
    '../src/components/Promotions.jsx', '../src/components/ProductOptionsModal.jsx', '../src/pages/Product.jsx',
    '../src/pages/Checkout.jsx', '../src/data/products.js',
  ]
  const source = (await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), 'utf8')))).join('\n')
  assert.doesNotMatch(source, /placeholder\.svg|unsplash|pexels|pixabay|placehold\.co/i)
})

test('public product views do not render internal SKU or reference values', async () => {
  const publicViews = [
    '../src/components/ProductCard.jsx',
    '../src/components/FeaturedProducts.jsx',
    '../src/components/ProductOptionsModal.jsx',
    '../src/components/ProductConfigurator.jsx',
    '../src/pages/Home.jsx',
    '../src/pages/Catalog.jsx',
    '../src/pages/Product.jsx',
    '../src/pages/ProductsOverview.jsx',
  ]
  const source = (await Promise.all(publicViews.map((file) => readFile(new URL(file, import.meta.url), 'utf8')))).join('\n')
  assert.doesNotMatch(source, /product\.sku|Referencia\s*\{|SKU\s*[:{]/i)

  const adminSource = await readFile(new URL('../src/components/ProductModal.jsx', import.meta.url), 'utf8')
  const cartSource = await readFile(new URL('../src/components/CartItem.jsx', import.meta.url), 'utf8')
  assert.match(adminSource, /SKU/)
  assert.match(cartSource, /item\.sku/)
})
