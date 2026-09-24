const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData

  const headers = isFormData
    ? {
        ...options.headers,
      }
    : {
        'Content-Type': 'application/json',
        ...options.headers,
      }

  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  })

  let data

  try {
    data = await response.json()
  } catch {
    data = {
      message: 'The server returned an invalid response.',
    }
  }

  if (!response.ok) {
    const error = new Error(
      data.message || 'Something went wrong',
    )

    error.status = response.status
    error.data = data

    throw error
  }

  return data
}

export async function apiDownload(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    let message = 'Unable to download file'

    try {
      const data = await response.json()

      if (data.message) {
        message = data.message
      }
    } catch {
      // Keep default message
    }

    throw new Error(message)
  }

  const blob = await response.blob()

  const contentDisposition =
    response.headers.get('Content-Disposition')

  let fileName = 'download.csv'

  const fileNameMatch =
    contentDisposition?.match(
      /filename="?([^"]+)"?/i,
    )

  if (fileNameMatch?.[1]) {
    fileName = fileNameMatch[1]
  }

  const url = window.URL.createObjectURL(blob)

  const link = document.createElement('a')

  link.href = url
  link.download = fileName

  document.body.appendChild(link)

  link.click()

  link.remove()

  window.URL.revokeObjectURL(url)
}