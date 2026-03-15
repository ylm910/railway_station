-- 创建数据库
CREATE DATABASE IF NOT EXISTS railway_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE railway_db;

-- 列车表
CREATE TABLE IF NOT EXISTS trains (
    id INT PRIMARY KEY,
    train_code VARCHAR(20) NOT NULL COMMENT '列车代码',
    train_type VARCHAR(10) COMMENT '列车类型',
    capacity INT DEFAULT 0 COMMENT '列车运量',
    status INT DEFAULT 1 COMMENT '状态 1-运营 0-停运',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_train_code (train_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='列车表';

-- 站点表
CREATE TABLE IF NOT EXISTS stations (
    id INT PRIMARY KEY,
    station_name VARCHAR(50) NOT NULL COMMENT '站点名称',
    station_code VARCHAR(20) COMMENT '站点编码',
    station_type VARCHAR(20) DEFAULT '中间站' COMMENT '站点类型',
    platforms INT DEFAULT 2 COMMENT '站台数量',
    remark VARCHAR(200) COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_station_name (station_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站点表';

-- 线路站点关联表
CREATE TABLE IF NOT EXISTS line_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    line_id INT NOT NULL COMMENT '运营线路编码',
    station_id INT NOT NULL COMMENT '站点ID',
    line_station_id INT COMMENT '线路站点ID',
    prev_station_id INT COMMENT '上一站ID',
    next_station_id INT COMMENT '下一站ID',
    distance DECIMAL(10,2) DEFAULT 0 COMMENT '站间距离',
    total_distance DECIMAL(10,2) DEFAULT 0 COMMENT '运输距离',
    line_code VARCHAR(20) COMMENT '线路代码',
    is_stop INT DEFAULT 1 COMMENT '是否停靠',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_line_id (line_id),
    INDEX idx_station_id (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='线路站点关联表';

-- 客运量表（完整字段）
DROP TABLE IF EXISTS passenger_flow;
CREATE TABLE IF NOT EXISTS passenger_flow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 基础信息
    line_id INT COMMENT '运营线路编码',
    train_id INT COMMENT '列车编码',
    station_id INT COMMENT '站点ID',
    skzld INT COMMENT '上客站点',
    sxbm INT COMMENT '上下编码',
    flow_date DATE COMMENT '运营日期',
    operate_time VARCHAR(20) COMMENT '运营时间',
    time_interval VARCHAR(20) COMMENT '运营时间间隔',
    
    -- 时间相关
    start_station_time VARCHAR(20) COMMENT '始发站时点',
    start_station_depart VARCHAR(20) COMMENT '始发站到时',
    arrive_time VARCHAR(20) COMMENT '到达时间',
    depart_time VARCHAR(20) COMMENT '出发时间',
    
    -- 客流相关
    boarding INT DEFAULT 0 COMMENT '上客量',
    alighting INT DEFAULT 0 COMMENT '下客量',
    remark VARCHAR(200) COMMENT '备注',
    train_depart_date VARCHAR(20) COMMENT '列车出发日期',
    train_depart_time VARCHAR(20) COMMENT '列车出发时间',
    sequence_no INT COMMENT '站点序号',
    
    -- 票务相关
    ticket_type VARCHAR(20) COMMENT '车票类型',
    ticket_price DECIMAL(10,2) COMMENT '车票价格',
    seat_type VARCHAR(20) COMMENT '座位类型',
    train_copo VARCHAR(20) COMMENT '列车编组',
    ticket_date VARCHAR(20) COMMENT '购票日期',
    
    -- 站点相关
    origin_station_id INT COMMENT '起点站ID',
    origin_station_static VARCHAR(50) COMMENT '起点站静态',
    origin_station_start VARCHAR(50) COMMENT '起点站起始',
    dest_station_id INT COMMENT '终点站ID',
    dest_station_static VARCHAR(50) COMMENT '终点站静态',
    dest_station_end VARCHAR(50) COMMENT '终点站终止',
    
    -- 列车相关
    train_class VARCHAR(20) COMMENT '列车等级',
    train_type VARCHAR(20) COMMENT '列车类型',
    
    -- 其他
    sale_station_id INT COMMENT '售票站ID',
    station_limit INT COMMENT '限制站',
    static_sps VARCHAR(50) COMMENT '静态SPS',
    to_station_id INT COMMENT '到达站ID',
    revenue DECIMAL(10,2) COMMENT '收入',
    
    -- 扩展字段
    kill_field VARCHAR(50) COMMENT 'kill字段',
    sokl VARCHAR(50) COMMENT 'sokl字段',
    kofig VARCHAR(50) COMMENT 'kofig字段',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_flow_date (flow_date),
    INDEX idx_station_id (station_id),
    INDEX idx_train_id (train_id),
    INDEX idx_origin_dest (origin_station_id, dest_station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客运量表';

-- 插入示例数据
INSERT INTO trains (id, train_code, train_type, capacity, status) VALUES
(1, 'G8501', 'G', 1106, 1),
(2, 'G8502', 'G', 1106, 1),
(3, 'D5101', 'D', 1378, 1),
(4, 'D5102', 'D', 1418, 1),
(5, 'C6301', 'C', 684, 1),
(6, 'K351', 'K', 1432, 1),
(7, 'Z95', 'Z', 1683, 1),
(8, 'T7', 'T', 1566, 1);

INSERT INTO stations (id, station_name, station_code, station_type, platforms) VALUES
(1, '成都东', 'CDW', '枢纽站', 14),
(2, '成都南', 'CDN', '枢纽站', 8),
(3, '重庆北', 'CQB', '枢纽站', 15),
(4, '重庆西', 'CQX', '枢纽站', 12),
(5, '内江北', 'NJB', '中间站', 4),
(6, '资阳北', 'ZYB', '中间站', 4),
(7, '永川东', 'YCD', '中间站', 4),
(8, '璧山', 'BS', '中间站', 4);

-- 插入模拟客流数据（包含完整字段）
INSERT INTO passenger_flow (line_id, train_id, station_id, flow_date, depart_time, boarding, alighting, 
    ticket_type, seat_type, train_class, train_type, origin_station_id, dest_station_id, ticket_price, revenue) VALUES
(1, 1, 1, CURDATE(), '08:00', 850, 0, 'W', '二等座', 'ICW', 'G', 1, 3, 154.5, 131325),
(1, 1, 6, CURDATE(), '08:35', 120, 80, 'W', '二等座', 'ICW', 'G', 1, 3, 48.5, 5820),
(1, 1, 5, CURDATE(), '09:05', 150, 100, 'W', '一等座', 'ICW', 'G', 1, 3, 247.0, 37050),
(1, 1, 7, CURDATE(), '09:45', 80, 200, 'W', '二等座', 'ICW', 'G', 1, 3, 48.5, 3880),
(1, 1, 8, CURDATE(), '10:10', 50, 150, 'W', '商务座', 'ICW', 'G', 1, 3, 306.0, 15300),
(1, 1, 3, CURDATE(), '10:30', 0, 720, 'W', '二等座', 'ICW', 'G', 1, 3, 154.5, 0),
(1, 2, 3, CURDATE(), '09:00', 780, 0, 'O', '二等座', 'CDW', 'G', 3, 1, 154.5, 120510),
(1, 2, 8, CURDATE(), '09:20', 100, 80, 'O', '一等座', 'CDW', 'G', 3, 1, 247.0, 24700),
(1, 2, 7, CURDATE(), '09:45', 120, 100, 'W', '二等座', 'CDW', 'G', 3, 1, 48.5, 5820),
(1, 2, 5, CURDATE(), '10:25', 80, 150, 'W', '二等座', 'CDW', 'G', 3, 1, 73.0, 5840),
(1, 2, 6, CURDATE(), '10:55', 60, 100, 'W', '商务座', 'CDW', 'G', 3, 1, 306.0, 18360),
(1, 2, 1, CURDATE(), '11:30', 0, 710, 'W', '二等座', 'CDW', 'G', 3, 1, 154.5, 0);
