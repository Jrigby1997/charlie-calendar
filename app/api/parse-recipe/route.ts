import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Try multiple strategies in order — stop at first success
    let html: string | null = null

    html ??= await fetchHtmlDirect(url)
    html ??= await fetchHtmlViaProxy(url)          // allorigins.win
    html ??= await fetchHtmlViaCodetabs(url)       // codetabs.com proxy
    html ??= await fetchHtmlViaJina(url)           // Jina Reader headless browser

    if (html === null) {
      return NextResponse.json(
        { error: 'Unable to import this recipe — the website is blocking automated access. Try a different recipe source (e.g. food.com, epicurious.com, or simplyrecipes.com).' },
        { status: 400 }
      )
    }

    // Parse schema.org JSON-LD recipe data
    const recipeData = parseRecipeFromHTML(html)

    if (!recipeData) {
      return NextResponse.json({ error: 'No recipe data found on this page' }, { status: 400 })
    }

    return NextResponse.json(recipeData)
  } catch (error) {
    console.error('Error parsing recipe:', error)
    return NextResponse.json({ error: 'Failed to parse recipe' }, { status: 500 })
  }
}

/** Direct fetch with browser-like headers. Returns HTML string or null if blocked. */
async function fetchHtmlDirect(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
      },
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

/** allorigins.win CORS proxy — different IP pool than direct. */
async function fetchHtmlViaProxy(url: string): Promise<string | null> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(proxyUrl, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) return null
    const json = await response.json() as { contents?: string; status?: { http_code?: number } }
    if ((json.status?.http_code ?? 200) >= 400) return null
    return json.contents ?? null
  } catch {
    return null
  }
}

/** codetabs.com proxy — another IP pool fallback. */
async function fetchHtmlViaCodetabs(url: string): Promise<string | null> {
  try {
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(proxyUrl, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) return null
    const text = await response.text()
    // codetabs returns the raw body; sanity-check it looks like HTML
    if (!text.includes('<') || text.length < 500) return null
    return text
  } catch {
    return null
  }
}

/**
 * Jina Reader — headless-browser service that bypasses Cloudflare and similar protection.
 * With X-Return-Format: html it returns the full rendered HTML so our JSON-LD parser works.
 */
async function fetchHtmlViaJina(url: string): Promise<string | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    const response = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        'X-Return-Format': 'html',
        'Accept': 'text/html',
      },
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    const text = await response.text()
    if (!text.includes('<') || text.length < 500) return null
    return text
  } catch {
    return null
  }
}

function parseRecipeFromHTML(html: string) {
  // Try to find JSON-LD structured data (schema.org)
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)

  for (const match of jsonLdMatches) {
    try {
      const jsonData = JSON.parse(match[1])

      // Handle both single recipe and array of items
      const recipes = Array.isArray(jsonData) ? jsonData : [jsonData]

      for (const item of recipes) {
        // Check if this is a Recipe or if it contains a Recipe in @graph
        let recipe = null

        // Check if @type is 'Recipe' or includes 'Recipe' in an array
        const isRecipe = (obj: any) => {
          if (!obj['@type']) return false
          return Array.isArray(obj['@type'])
            ? obj['@type'].includes('Recipe')
            : obj['@type'] === 'Recipe'
        }

        if (isRecipe(item)) {
          recipe = item
        } else if (item['@graph']) {
          recipe = item['@graph'].find((g: any) => isRecipe(g))
        }

        if (recipe) {
          return parseSchemaOrgRecipe(recipe)
        }
      }
    } catch (e) {
      // Invalid JSON, continue to next script tag
      continue
    }
  }

  // Fallback: try basic HTML parsing if no JSON-LD found
  return parseRecipeFromHTMLFallback(html)
}

function parseSchemaOrgRecipe(recipe: any) {
  // Parse ingredients
  const ingredients = (recipe.recipeIngredient || []).map((ing: string) => {
    return parseIngredientString(ing)
  })

  // Parse instructions
  let instructions = ''
  if (typeof recipe.recipeInstructions === 'string') {
    instructions = recipe.recipeInstructions
  } else if (Array.isArray(recipe.recipeInstructions)) {
    instructions = recipe.recipeInstructions
      .map((step: any) => {
        if (typeof step === 'string') return step
        if (step.text) return step.text
        return ''
      })
      .filter(Boolean)
      .map((step: string, i: number) => `${i + 1}. ${step}`)
      .join('\n\n')
  }

  // Parse times (ISO 8601 duration format to minutes)
  const prepTime = parseDuration(recipe.prepTime)
  const cookTime = parseDuration(recipe.cookTime)

  // Parse nutrition information
  const nutrition = recipe.nutrition
  const protein = nutrition?.proteinContent ? parseFloat(nutrition.proteinContent) : null
  const fat = nutrition?.fatContent ? parseFloat(nutrition.fatContent) : null
  const carbs = nutrition?.carbohydrateContent ? parseFloat(nutrition.carbohydrateContent) : null
  const calories = nutrition?.calories ? parseInt(nutrition.calories) : null

  // Parse dietary tags from suitableForDiet
  const dietary_tags: string[] = []
  if (recipe.suitableForDiet) {
    const diets = Array.isArray(recipe.suitableForDiet) ? recipe.suitableForDiet : [recipe.suitableForDiet]
    diets.forEach((diet: any) => {
      const dietType = typeof diet === 'string' ? diet : diet['@type']
      if (dietType) {
        // Extract diet name from schema.org format (e.g., "https://schema.org/VeganDiet" -> "Vegan")
        const dietName = dietType.replace(/.*\/(.*?)Diet$/i, '$1')
        if (dietName && dietName !== dietType) {
          dietary_tags.push(dietName)
        }
      }
    })
  }

  return {
    name: recipe.name || '',
    description: recipe.description || '',
    instructions: instructions || '',
    ingredients: ingredients.filter((ing: any) => ing.ingredient_name),
    prep_time: prepTime,
    cook_time: cookTime,
    servings: parseServings(recipe.recipeYield),
    calories: calories,
    protein: protein,
    fat: fat,
    carbs: carbs,
    dietary_tags: dietary_tags,
  }
}

function parseIngredientString(ingredientStr: string) {
  // Try to extract amount, measurement, and ingredient name
  // Examples: "2 cups flour", "1/2 tsp salt", "3 eggs", "1.75 cups flour"

  const cleaned = ingredientStr.trim()

  // Match patterns like "2 cups", "1/2 tsp", "1 1/2 cups", "1.75 cups"
  // Allow decimals, fractions, and whole numbers
  const match = cleaned.match(/^([\d\/\.\s]+)\s*([a-z]+)?\s+(.+)$/i)

  if (match) {
    const amountStr = match[1].trim()
    const measurement = match[2] || 'whole'
    const ingredient = match[3].trim()

    // Convert fractions and decimals to numbers
    let amount: number
    if (amountStr.includes('/')) {
      // Handle fractions like "1/2" or "1 1/2"
      const parts = amountStr.split(/\s+/)
      amount = parts.reduce((sum, part) => {
        if (part.includes('/')) {
          const [num, den] = part.split('/')
          return sum + (parseFloat(num) / parseFloat(den))
        }
        return sum + parseFloat(part)
      }, 0)
    } else {
      amount = parseFloat(amountStr)
    }

    return {
      ingredient_name: ingredient,
      amount: amount || 1,
      measurement: measurement || 'whole',
    }
  }

  // Fallback: treat entire string as ingredient name
  return {
    ingredient_name: cleaned,
    amount: 1,
    measurement: 'whole',
  }
}

function parseDuration(duration?: string): number | null {
  if (!duration) return null

  // Parse ISO 8601 duration format (PT30M, PT1H, PT1H30M)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (match) {
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    return hours * 60 + minutes
  }

  return null
}

function parseServings(recipeYield?: string | number | string[]): number | null {
  if (!recipeYield) return null

  // Handle arrays - take first element
  if (Array.isArray(recipeYield)) {
    recipeYield = recipeYield[0]
  }

  if (typeof recipeYield === 'number') return recipeYield

  // Extract numbers from strings like "Serves 4", "4 servings", "4-6 servings"
  const match = recipeYield.match(/\d+/)
  return match ? parseInt(match[0]) : null
}

function parseRecipeFromHTMLFallback(html: string) {
  // Basic fallback parsing - look for common recipe HTML patterns
  // This is a simple implementation, can be expanded

  const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
  const name = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : ''

  return name ? {
    name,
    instructions: '',
    ingredients: [],
    prep_time: null,
    cook_time: null,
    servings: null,
    calories: null,
  } : null
}
