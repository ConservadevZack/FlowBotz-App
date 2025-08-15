"""
Database security utilities for FlowBotz API
Provides secure database operations and prevents SQL injection attacks
"""
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
import re
import logging
from contextlib import contextmanager
import hashlib
import secrets


logger = logging.getLogger(__name__)


class DatabaseSecurity:
    """Database security utilities and query sanitization"""
    
    # SQL injection patterns to detect and block
    SQL_INJECTION_PATTERNS = [
        r"(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+",
        r"(?i)(or|and)\s+\d+\s*=\s*\d+",
        r"['\"];?\s*(drop|delete|insert|update|select)",
        r"--\s*",  # SQL comments
        r"/\*.*?\*/",  # SQL block comments
        r"(?i)xp_cmdshell",
        r"(?i)sp_executesql",
        r"(?i)(char|ascii|substring|length)\s*\(",
        r"(?i)waitfor\s+delay",
        r"(?i)benchmark\s*\(",
        r"(?i)pg_sleep\s*\(",
    ]
    
    # Characters that should be escaped in SQL strings
    DANGEROUS_CHARS = ["'", '"', ';', '--', '/*', '*/', 'xp_', 'sp_']
    
    # Maximum lengths for different field types
    FIELD_LIMITS = {
        'email': 254,
        'name': 100,
        'description': 2000,
        'url': 2048,
        'token': 512,
        'id': 50,
        'search_query': 500
    }
    
    @classmethod
    def validate_field_length(cls, field_name: str, value: str) -> str:
        """Validate field length against limits"""
        max_length = cls.FIELD_LIMITS.get(field_name, 255)
        if len(value) > max_length:
            raise ValueError(f"Field '{field_name}' exceeds maximum length of {max_length}")
        return value
    
    @classmethod
    def detect_sql_injection(cls, value: str) -> bool:
        """Detect potential SQL injection attempts"""
        if not isinstance(value, str):
            return False
        
        value_lower = value.lower()
        
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_lower):
                logger.warning(f"SQL injection attempt detected: {pattern}")
                return True
        
        return False
    
    @classmethod
    def sanitize_string(cls, value: str, field_name: str = None) -> str:
        """Sanitize string value to prevent SQL injection"""
        if not isinstance(value, str):
            raise ValueError("Value must be a string")
        
        # Check for SQL injection patterns
        if cls.detect_sql_injection(value):
            raise ValueError("Potentially malicious content detected")
        
        # Validate field length
        if field_name:
            value = cls.validate_field_length(field_name, value)
        
        # Basic sanitization - escape dangerous characters
        # Note: In production with ORMs like SQLAlchemy or using parameterized queries,
        # this level of sanitization might be overkill, but it's good defense in depth
        value = value.replace("'", "''")  # Escape single quotes
        value = re.sub(r'--.*$', '', value, flags=re.MULTILINE)  # Remove SQL comments
        value = re.sub(r'/\*.*?\*/', '', value, flags=re.DOTALL)  # Remove block comments
        
        return value.strip()
    
    @classmethod
    def sanitize_identifier(cls, identifier: str) -> str:
        """Sanitize database identifier (table/column names)"""
        if not isinstance(identifier, str):
            raise ValueError("Identifier must be a string")
        
        # Only allow alphanumeric characters and underscores
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', identifier):
            raise ValueError("Invalid database identifier")
        
        if len(identifier) > 63:  # PostgreSQL limit
            raise ValueError("Identifier too long")
        
        return identifier
    
    @classmethod
    def validate_email(cls, email: str) -> str:
        """Validate and sanitize email address"""
        email = cls.sanitize_string(email, 'email')
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValueError("Invalid email format")
        
        return email.lower()
    
    @classmethod
    def validate_uuid(cls, uuid_str: str) -> str:
        """Validate UUID format"""
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        if not re.match(uuid_pattern, uuid_str.lower()):
            raise ValueError("Invalid UUID format")
        return uuid_str.lower()
    
    @classmethod
    def build_safe_where_clause(cls, conditions: Dict[str, Any]) -> tuple:
        """Build safe WHERE clause with parameterized queries"""
        where_parts = []
        params = {}
        
        for field, value in conditions.items():
            # Sanitize field name
            safe_field = cls.sanitize_identifier(field)
            
            if value is None:
                where_parts.append(f"{safe_field} IS NULL")
            elif isinstance(value, (list, tuple)):
                # Handle IN clauses
                param_names = []
                for i, item in enumerate(value):
                    param_name = f"{safe_field}_{i}"
                    param_names.append(f":{param_name}")
                    
                    if isinstance(item, str):
                        params[param_name] = cls.sanitize_string(item)
                    else:
                        params[param_name] = item
                
                where_parts.append(f"{safe_field} IN ({', '.join(param_names)})")
            else:
                param_name = safe_field
                where_parts.append(f"{safe_field} = :{param_name}")
                
                if isinstance(value, str):
                    params[param_name] = cls.sanitize_string(value)
                else:
                    params[param_name] = value
        
        where_clause = " AND ".join(where_parts) if where_parts else "1=1"
        return where_clause, params
    
    @classmethod
    def build_safe_order_by(cls, sort_field: str, sort_order: str = "ASC") -> str:
        """Build safe ORDER BY clause"""
        safe_field = cls.sanitize_identifier(sort_field)
        
        if sort_order.upper() not in ["ASC", "DESC"]:
            raise ValueError("Invalid sort order")
        
        return f"ORDER BY {safe_field} {sort_order.upper()}"
    
    @classmethod
    def build_safe_limit_offset(cls, limit: int, offset: int = 0) -> tuple:
        """Build safe LIMIT and OFFSET clause"""
        if not isinstance(limit, int) or limit < 1:
            raise ValueError("Invalid limit value")
        
        if not isinstance(offset, int) or offset < 0:
            raise ValueError("Invalid offset value")
        
        # Reasonable limits to prevent resource exhaustion
        if limit > 1000:
            raise ValueError("Limit too large (max 1000)")
        
        if offset > 100000:
            raise ValueError("Offset too large (max 100000)")
        
        return limit, offset


class SecureSupabaseClient:
    """Secure wrapper for Supabase operations"""
    
    def __init__(self, supabase_client):
        self.client = supabase_client
        self.db_security = DatabaseSecurity()
    
    def secure_select(
        self,
        table: str,
        columns: List[str] = None,
        where_conditions: Dict[str, Any] = None,
        order_by: str = None,
        order_direction: str = "asc",
        limit: int = None,
        offset: int = 0
    ):
        """Secure SELECT operation with input validation"""
        try:
            # Validate table name
            safe_table = self.db_security.sanitize_identifier(table)
            
            # Start the query
            query = self.client.table(safe_table)
            
            # Select specific columns if provided
            if columns:
                safe_columns = [self.db_security.sanitize_identifier(col) for col in columns]
                query = query.select(','.join(safe_columns))
            else:
                query = query.select("*")
            
            # Add WHERE conditions
            if where_conditions:
                for field, value in where_conditions.items():
                    safe_field = self.db_security.sanitize_identifier(field)
                    
                    if isinstance(value, str):
                        safe_value = self.db_security.sanitize_string(value)
                        query = query.eq(safe_field, safe_value)
                    elif isinstance(value, (list, tuple)):
                        # Handle IN clauses
                        query = query.in_(safe_field, value)
                    elif value is None:
                        query = query.is_(safe_field, 'null')
                    else:
                        query = query.eq(safe_field, value)
            
            # Add ordering
            if order_by:
                safe_order_field = self.db_security.sanitize_identifier(order_by)
                if order_direction.lower() == "desc":
                    query = query.order(safe_order_field, desc=True)
                else:
                    query = query.order(safe_order_field)
            
            # Add pagination
            if limit:
                safe_limit, safe_offset = self.db_security.build_safe_limit_offset(limit, offset)
                query = query.limit(safe_limit)
                if safe_offset > 0:
                    query = query.offset(safe_offset)
            
            # Execute query
            response = query.execute()
            return response
            
        except Exception as e:
            logger.error(f"Secure select failed: {e}")
            raise ValueError(f"Database operation failed: {str(e)}")
    
    def secure_insert(self, table: str, data: Dict[str, Any]):
        """Secure INSERT operation with input validation"""
        try:
            safe_table = self.db_security.sanitize_identifier(table)
            
            # Sanitize data
            safe_data = {}
            for field, value in data.items():
                safe_field = self.db_security.sanitize_identifier(field)
                
                if isinstance(value, str):
                    safe_data[safe_field] = self.db_security.sanitize_string(value, safe_field)
                else:
                    safe_data[safe_field] = value
            
            response = self.client.table(safe_table).insert(safe_data).execute()
            return response
            
        except Exception as e:
            logger.error(f"Secure insert failed: {e}")
            raise ValueError(f"Database operation failed: {str(e)}")
    
    def secure_update(
        self,
        table: str,
        data: Dict[str, Any],
        where_conditions: Dict[str, Any]
    ):
        """Secure UPDATE operation with input validation"""
        try:
            safe_table = self.db_security.sanitize_identifier(table)
            
            # Sanitize update data
            safe_data = {}
            for field, value in data.items():
                safe_field = self.db_security.sanitize_identifier(field)
                
                if isinstance(value, str):
                    safe_data[safe_field] = self.db_security.sanitize_string(value, safe_field)
                else:
                    safe_data[safe_field] = value
            
            # Build query with WHERE conditions
            query = self.client.table(safe_table)
            
            for field, value in where_conditions.items():
                safe_field = self.db_security.sanitize_identifier(field)
                
                if isinstance(value, str):
                    safe_value = self.db_security.sanitize_string(value)
                    query = query.eq(safe_field, safe_value)
                else:
                    query = query.eq(safe_field, value)
            
            response = query.update(safe_data).execute()
            return response
            
        except Exception as e:
            logger.error(f"Secure update failed: {e}")
            raise ValueError(f"Database operation failed: {str(e)}")
    
    def secure_delete(self, table: str, where_conditions: Dict[str, Any]):
        """Secure DELETE operation with input validation"""
        try:
            safe_table = self.db_security.sanitize_identifier(table)
            
            if not where_conditions:
                raise ValueError("DELETE operations must include WHERE conditions")
            
            # Build query with WHERE conditions
            query = self.client.table(safe_table)
            
            for field, value in where_conditions.items():
                safe_field = self.db_security.sanitize_identifier(field)
                
                if isinstance(value, str):
                    safe_value = self.db_security.sanitize_string(value)
                    query = query.eq(safe_field, safe_value)
                else:
                    query = query.eq(safe_field, value)
            
            response = query.delete().execute()
            return response
            
        except Exception as e:
            logger.error(f"Secure delete failed: {e}")
            raise ValueError(f"Database operation failed: {str(e)}")


class AuditLogger:
    """Security audit logging for database operations"""
    
    def __init__(self):
        self.logger = logging.getLogger("security_audit")
    
    def log_database_access(
        self,
        user_id: str,
        operation: str,
        table: str,
        conditions: Dict[str, Any] = None,
        success: bool = True,
        error: str = None
    ):
        """Log database access attempts"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "operation": operation,
            "table": table,
            "conditions": conditions,
            "success": success,
            "error": error,
            "session_id": self._get_session_id()
        }
        
        if success:
            self.logger.info(f"DB_ACCESS: {log_data}")
        else:
            self.logger.warning(f"DB_ACCESS_FAILED: {log_data}")
    
    def log_security_violation(
        self,
        user_id: str,
        violation_type: str,
        details: Dict[str, Any],
        severity: str = "HIGH"
    ):
        """Log security violations"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "violation_type": violation_type,
            "details": details,
            "severity": severity,
            "session_id": self._get_session_id()
        }
        
        if severity == "CRITICAL":
            self.logger.critical(f"SECURITY_VIOLATION: {log_data}")
        elif severity == "HIGH":
            self.logger.error(f"SECURITY_VIOLATION: {log_data}")
        else:
            self.logger.warning(f"SECURITY_VIOLATION: {log_data}")
    
    def _get_session_id(self) -> str:
        """Generate session ID for audit tracking"""
        return hashlib.sha256(
            f"{datetime.utcnow().isoformat()}{secrets.token_hex(8)}".encode()
        ).hexdigest()[:16]


# Global instances
db_security = DatabaseSecurity()
audit_logger = AuditLogger()