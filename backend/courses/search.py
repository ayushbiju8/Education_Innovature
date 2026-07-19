import logging
from django.conf import settings
from django.db.models import Q, Case, When
from django.db import connection
from .models import Course

logger = logging.getLogger(__name__)

class SearchBackend:
    _client = None
    _enabled = False
    _checked = False

    @classmethod
    def get_client(cls):
        if cls._checked:
            return cls._client if cls._enabled else None
        
        cls._checked = True
        es_url = getattr(settings, 'ELASTICSEARCH_URL', None)
        if not es_url:
            cls._enabled = False
            cls._client = None
            return None
        
        try:
            from elasticsearch import Elasticsearch
            client = Elasticsearch(es_url, request_timeout=3)
            # Test connection
            if client.ping():
                cls._client = client
                cls._enabled = True
                logger.info("Elasticsearch search backend initialized successfully.")
                return cls._client
            else:
                logger.warning("Elasticsearch ping failed. Falling back to DB search.")
                cls._client = None
                cls._enabled = False
                return None
        except Exception as e:
            logger.error(f"Failed to initialize Elasticsearch client: {e}. Falling back to DB search.")
            cls._client = None
            cls._enabled = False
            return None

    @classmethod
    def index_course(cls, course):
        """Index a single course in Elasticsearch"""
        client = cls.get_client()
        if not client:
            return False
        try:
            # Build search document
            tags = [tag.name for tag in course.tags.all()]
            lessons_content = []
            for module in course.modules.all():
                for lesson in module.lessons.all():
                    lessons_content.append(f"{lesson.title} {lesson.content}")
            
            doc = {
                'id': course.id,
                'title': course.title,
                'description': course.description,
                'category_id': course.category.id if course.category else None,
                'category_name': course.category.name if course.category else "",
                'mentor_name': course.mentor.username if course.mentor else "",
                'price': float(course.price),
                'is_published': course.is_published,
                'tags': tags,
                'lessons_content': " ".join(lessons_content),
            }
            client.index(index='courses', id=course.id, document=doc)
            return True
        except Exception as e:
            logger.error(f"Elasticsearch indexing error for course {course.id}: {e}")
            return False

    @classmethod
    def delete_course(cls, course_id):
        """Remove a course from Elasticsearch index"""
        client = cls.get_client()
        if not client:
            return False
        try:
            client.delete(index='courses', id=course_id, ignore=[404])
            return True
        except Exception as e:
            logger.error(f"Elasticsearch index deletion error for course {course_id}: {e}")
            return False

    @classmethod
    def search_courses(cls, queryset, query_str, deep_search=False, category_id=None, tag_id=None, min_price=None, max_price=None):
        """
        Search and filter courses on top of a base queryset.
        If Elasticsearch is enabled and active, queries ES.
        Otherwise, falls back to PostgreSQL Full-Text Search or Q queries.
        """
        client = cls.get_client()
        
        # If ES is running, attempt search
        if client:
            try:
                fields = ['title^4', 'description^2']
                if deep_search:
                    fields.append('lessons_content')
                
                must_queries = []
                if query_str.strip():
                    must_queries.append({
                        "multi_match": {
                            "query": query_str,
                            "fields": fields,
                            "fuzziness": "AUTO"
                        }
                    })
                else:
                    must_queries.append({"match_all": {}})
                
                # Filters
                filters = []
                if category_id:
                    filters.append({"term": {"category_id": int(category_id)}})
                if min_price is not None:
                    filters.append({"range": {"price": {"gte": float(min_price)}}})
                if max_price is not None:
                    filters.append({"range": {"price": {"lte": float(max_price)}}})
                
                body = {
                    "query": {
                        "bool": {
                            "must": must_queries,
                            "filter": filters
                        }
                    },
                    "size": 100
                }
                
                res = client.search(index='courses', body=body)
                hits = res['hits']['hits']
                course_ids = [int(hit['_id']) for hit in hits]
                
                if not course_ids:
                    return queryset.none()
                
                qs = queryset.filter(id__in=course_ids)
                if tag_id:
                    qs = qs.filter(tags__id=tag_id)
                
                # Sort Django QuerySet to match ES score order
                preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(course_ids)])
                return qs.order_by(preserved).distinct()
            except Exception as e:
                logger.error(f"Elasticsearch search failed: {e}. Falling back to Database search.")
                # fall through to DB search
        
        # 2. PostgreSQL Full-Text Search Fallback
        db_engine = connection.settings_dict.get('ENGINE', '')
        is_postgres = 'postgresql' in db_engine
        
        # Build query filters
        qs = queryset
        if category_id:
            qs = qs.filter(category_id=category_id)
        if tag_id:
            qs = qs.filter(tags__id=tag_id)
        if min_price is not None:
            qs = qs.filter(price__gte=min_price)
        if max_price is not None:
            qs = qs.filter(price__lte=max_price)
            
        if not query_str.strip():
            return qs

        if is_postgres:
            try:
                from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
                
                vector = SearchVector('title', weight='A') + SearchVector('description', weight='B')
                if deep_search:
                    vector += SearchVector('modules__lessons__title', weight='C') + SearchVector('modules__lessons__content', weight='C')
                
                search_query = SearchQuery(query_str)
                qs = qs.annotate(rank=SearchRank(vector, search_query)).filter(rank__gt=0.0).order_by('-rank')
                return qs.distinct()
            except Exception as e:
                logger.error(f"PostgreSQL Full-Text search failed: {e}. Falling back to basic search.")
                # fall through to standard ORM filter
        
        # 3. Simple Q Filter Fallback (SQLite or if postgres FTS error)
        q_obj = Q(title__icontains=query_str) | Q(description__icontains=query_str)
        if deep_search:
            q_obj |= Q(modules__lessons__title__icontains=query_str) | Q(modules__lessons__content__icontains=query_str)
            
        return qs.filter(q_obj).distinct()

