"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import mimetypes

from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include, re_path
from django.views.static import serve

# Fix MIME types on Windows (Python may default .js to text/plain)
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')


def frontend_view(request, path=''):
    """Serve the React frontend index.html for all non-API routes."""
    index_file = settings.FRONTEND_DIR / 'index.html'
    if index_file.exists():
        return HttpResponse(
            index_file.read_bytes(),
            content_type='text/html; charset=utf-8',
        )
    return HttpResponse(
        'Frontend not built. Run <code>npm run build</code> in frontend/.',
        status=501,
    )


def frontend_file(request, path):
    """Serve any file from the frontend dist folder."""
    return serve(request, path, document_root=settings.FRONTEND_DIR)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/jdr/', include('jdr.urls')),
    path('api/muscu/', include('muscu.urls')),
    # Frontend assets (JS, CSS, images) — keep 'assets/' in the path
    re_path(r'^(?P<path>assets/.+)$', frontend_file),
    # Public files copied by Vite to dist root (logos, svg, pdf, etc.)
    re_path(r'^(?P<path>.+\.(?:png|svg|ico|jpg|jpeg|gif|webp|pdf|txt|webmanifest))$', frontend_file),
    # Catch-all: serve React index.html for client-side routing
    re_path(r'^(?!admin|api|media).*$', frontend_view),
]
